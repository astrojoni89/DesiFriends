import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
// import * as Notifications from "expo-notifications";
import notifee from "@notifee/react-native";
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTimerContext } from "@/context/TimerContext";
import { scheduleMashNotification } from "@/hooks/useMashNotifications";

import { AnimatedCircularProgress } from "react-native-circular-progress";

export default function MashTimerStep() {
  const { id, targetSize } = useLocalSearchParams<{
    id: string;
    targetSize?: string;
  }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id || "");
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();

  const steps = recipe?.mashSteps ?? [];
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const mashTimerId = `mash-${id}-step-${stepIndex}`;
  const durationSec = parseInt(step?.duration || "0") * 60;

  const { mash, stopAllTimers } = useTimerContext();
  const timeLeft = mash.getTimeLeft();
  const paused = mash.isPaused();

  useEffect(() => {
    mash.resetTimer();
  }, [stepIndex]);

  useEffect(() => {
    const maybeReschedule = async () => {
      if (
        Device.isDevice &&
        mash.timer &&
        !mash.timer.paused &&
        mash.timer.startTimestamp != null
      ) {
        const now = Date.now();
        const elapsed = Math.floor((now - mash.timer.startTimestamp) / 1000);
        const delay = Math.max(1, mash.timer.duration - elapsed);
        await scheduleMashNotification({
          duration: delay,
          stepIndex: mash.timer.stepIndex,
          onScheduled: (id) =>
            mash.setNotificationId(mash.timer!.stepIndex, id),
        });
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
    const currentStep = mash.timer?.stepIndex ?? stepIndex;

    if (!mash.timer) {
      await stopAllTimers(); // ensure no other timer or notification is active

      mash.startTimer({
        id: mashTimerId,
        type: "mash",
        stepIndex,
        duration: durationSec,
      });

      if (Device.isDevice) {
        await scheduleMashNotification({
          duration: durationSec,
          stepIndex,
          onScheduled: (id) => mash.setNotificationId(stepIndex, id),
        });
      }
      return;
    }

    if (paused) {
      mash.resumeTimer();

      if (Device.isDevice && mash.timer?.startTimestamp != null) {
        const now = Date.now();
        const elapsed = Math.floor((now - mash.timer.startTimestamp) / 1000);
        const delay = Math.max(1, mash.timer.duration - elapsed);

        await scheduleMashNotification({
          duration: delay,
          stepIndex: currentStep,
          onScheduled: (id) => mash.setNotificationId(currentStep, id),
        });
      }
    } else {
      await notifee.cancelAllNotifications();
      mash.pauseTimer();
    }
  };

  const handleReset = async () => {
    await stopAllTimers();
  };

  const nextStep = () => setStepIndex((prev) => prev + 1);

  const goToBoil = () =>
    router.push({
      pathname: "/brewflow/[id]/boil",
      params: { id, targetSize },
    });

  const timer = mash.timer;
  const total = durationSec;

  // Detect first load: no timer ever started, and no time elapsed
  const isFirstStart = !timer && timeLeft === 0;

  const circleFill = !timer && timeLeft === 0 ? 100 : (timeLeft / total) * 100;

  if (!recipe || steps.length === 0 || !step) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keine Rasten gefunden</Text>
        <Pressable style={styles.button} onPress={goToBoil}>
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
          onPress={goToBoil}
        >
          <Text style={styles.buttonText}>Kochen starten</Text>
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
        onPress={goToBoil}
        disabled={mash.isRunning()}
      >
        <Text style={styles.buttonText}>Überspringen</Text>
      </Pressable>
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
  });
}
