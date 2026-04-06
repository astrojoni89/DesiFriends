import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { loadNotifee } from "@/utils/notifeeWrapper"; // dynamic safe import
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import { usePermissionDialogs } from "@/hooks/usePermissionDialogs";
import type { AppTheme } from "@/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTimerContext } from "@/context/TimerContext";
import { scheduleMashNotification } from "@/hooks/useMashNotifications";

import { AnimatedCircularProgress } from "react-native-circular-progress";

export default function MashTimerStep() {
  const { id, targetSize, actualAlphaAcids } = useLocalSearchParams<{
    id: string;
    targetSize?: string;
    actualAlphaAcids?: string;
  }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id || "");
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();
  const parsedAlphaAcids = actualAlphaAcids ? JSON.parse(actualAlphaAcids) : {};

  const { mash, stopAllTimers, startBrewSession } = useTimerContext();
  const { onPermissionDenied, PermissionDialog } = usePermissionDialogs();
  const [, setTick] = useState(0);
  const isScheduling = useRef(false);

  const steps = recipe?.mashSteps ?? [];
  // Initialise from a restored timer so we return to the correct step.
  const [stepIndex, setStepIndex] = useState(() => mash.timer?.stepIndex ?? 0);
  const step = steps[stepIndex];
  const mashTimerId = `mash-${id}-step-${stepIndex}`;
  const durationSec = parseInt(step?.duration || "0") * 60;
  const timeLeft = mash.getTimeLeft();
  const paused = mash.isPaused();

  // Tracks the full expected duration for the current step, including any
  // extensions. Initialised from the recipe and reset when the step changes.
  const [stepDuration, setStepDuration] = useState(durationSec);

  // Local interval drives display re-renders every second independently of
  // the context memo, which no longer propagates on every tick.
  useEffect(() => {
    if (!mash.timer || mash.timer.paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [mash.timer?.paused, mash.timer?.startTimestamp]);

  // Skip the reset on the first render — resetting immediately would wipe a
  // timer that was just restored from AsyncStorage.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const cancelAndReset = async () => {
      const notifee = await loadNotifee();
      if (notifee) await notifee.default.cancelAllNotifications();
      setStepDuration(durationSec);
      mash.resetTimer();
    };
    cancelAndReset();
  }, [stepIndex]);

  useEffect(() => {
    const maybeReschedule = async () => {
      if (
        Device.isDevice &&
        mash.timer &&
        !mash.timer.paused &&
        mash.timer.startTimestamp != null
      ) {
        if (isScheduling.current) return;
        isScheduling.current = true;
        try {
          const notifee = await loadNotifee();
          if (notifee) await notifee.default.cancelAllNotifications();

          const now = Date.now();
          const elapsed = Math.floor((now - mash.timer.startTimestamp) / 1000);
          const delay = Math.max(1, mash.timer.duration - elapsed);

          await scheduleMashNotification({
            duration: delay,
            stepIndex: mash.timer.stepIndex,
            onScheduled: (id) =>
              mash.setNotificationId(mash.timer!.stepIndex, id),
            onPermissionDenied,
          });
        } finally {
          isScheduling.current = false;
        }
      }
    };

    maybeReschedule();
  }, [mash.timer?.startTimestamp]);

  const getDisplayTime = () => {
    if (!mash.timer) {
      const secs = durationSec;
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    return mash.getFormattedTime();
  };

  const handleTogglePause = async () => {
    if (!mash.timer) {
      await stopAllTimers();
      await startBrewSession(id!, targetSize);
      mash.startTimer({
        id: mashTimerId,
        type: "mash",
        stepIndex,
        duration: durationSec,
        targetSize: targetSize,
      });
      // Notification is scheduled by the useEffect watching startTimestamp.
      return;
    }

    if (paused) {
      mash.resumeTimer();
      // Notification rescheduling handled by the useEffect watching startTimestamp.
    } else {
      const notifee = await loadNotifee();
      if (notifee) {
        await notifee.default.cancelAllNotifications();
      }
      mash.pauseTimer();
    }
  };

  const handleReset = async () => {
    await stopAllTimers();
  };

  const handleExtend = async (extraMinutes: number) => {
    const extraSeconds = extraMinutes * 60;
    setStepDuration((prev) => prev + extraSeconds);
    mash.extendTimer(extraSeconds);

    // Reschedule the step-complete notification with the new remaining time.
    // Cancel first to avoid a duplicate firing at the original end time.
    if (Device.isDevice && mash.timer && mash.timer.startTimestamp !== null) {
      const notifee = await loadNotifee();
      if (notifee) await notifee.default.cancelAllNotifications();

      const elapsed = Math.floor((Date.now() - mash.timer.startTimestamp) / 1000);
      const delay = Math.max(1, mash.timer.duration + extraSeconds - elapsed);
      await scheduleMashNotification({
        duration: delay,
        stepIndex: mash.timer.stepIndex ?? stepIndex,
        onScheduled: (id) => mash.setNotificationId(mash.timer!.stepIndex, id),
        onPermissionDenied,
      });
    }
  };

  const nextStep = () => setStepIndex((prev) => prev + 1);

  const goToLauter = () =>
    router.push({
      pathname: "/brewflow/[id]/lauter",
      params: { id, targetSize, actualAlphaAcids: JSON.stringify(parsedAlphaAcids) },
    });


  const timer = mash.timer;
  const circleFill = !timer ? 100 : (timeLeft / stepDuration) * 100;

  if (!recipe || steps.length === 0 || !step) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keine Rasten gefunden</Text>
        <Pressable style={styles.button} onPress={goToLauter}>
          <Text style={styles.buttonText}>Zum Kochen springen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Maische: Schritt {stepIndex + 1} / {steps.length}
      </Text>
      <Text style={styles.text}>
        {step.temperature}°C für {step.duration} min
      </Text>

      <AnimatedCircularProgress
        size={180}
        width={12}
        fill={circleFill}
        tintColor={colors.primary}
        backgroundColor={colors.surfaceVariant}
        rotation={0}
      >
        {() => (
          <View style={styles.timerContainer}>
            <Text style={styles.timer}>{getDisplayTime()}</Text>
          </View>
        )}
      </AnimatedCircularProgress>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable style={styles.iconButton} onPress={handleTogglePause}>
          <Ionicons
            name={paused ? "play" : "pause"}
            size={28}
            color={colors.onPrimary}
          />
        </Pressable>

        <Pressable
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>

      {stepIndex < steps.length - 1 && (
        <Pressable
          style={[
            styles.button,
            { marginTop: 20, opacity: mash.isRunning() ? 0.5 : 1 },
          ]}
          onPress={nextStep}
          disabled={mash.isRunning()}
        >
          <Text style={styles.buttonText}>Nächster Schritt</Text>
        </Pressable>
      )}

      {mash.timer && timeLeft <= 0 && stepIndex === steps.length - 1 && (
        <Pressable
          style={[styles.button, { marginTop: 20 }]}
          onPress={goToLauter}
        >
          <Text style={styles.buttonText}>Läutern</Text>
        </Pressable>
      )}

      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: colors.secondary,
            opacity: mash.isRunning() ? 0.5 : 1,
          },
        ]}
        onPress={goToLauter}
        disabled={mash.isRunning()}
      >
        <Text style={styles.buttonText}>Überspringen</Text>
      </Pressable>

      {mash.timer && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable style={styles.extendButton} onPress={() => handleExtend(1)}>
            <Text style={styles.extendButtonText}>+1 min</Text>
          </Pressable>
          <Pressable style={styles.extendButton} onPress={() => handleExtend(5)}>
            <Text style={styles.extendButtonText}>+5 min</Text>
          </Pressable>
        </View>
      )}
      {PermissionDialog}
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16,
      color: colors.onBackground,
    },
    text: {
      fontSize: 18,
      marginBottom: 12,
      color: colors.text,
    },
    timerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    timer: {
      fontSize: 48,
      fontWeight: "bold",
      marginBottom: 24,
      color: colors.primary,
      textAlign: "center",
      transform: [{ translateY: 9 }],
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 12,
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
    iconButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },
    extendButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 20,
    },
    extendButtonText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 15,
    },
  });
}
