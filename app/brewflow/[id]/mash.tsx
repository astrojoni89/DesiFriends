import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { loadNotifee } from "@/utils/notifeeWrapper"; // dynamic safe import
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTimerContext } from "@/context/TimerContext";
import {
  cancelMashNotifications,
  scheduleMashNotifications,
} from "@/hooks/useMashNotifications";
import { setupMashNotificationChannel } from "@/hooks/useMashNotifications";

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

  const durationMin = parseInt(step?.duration || "0") || 0;
  const durationMs = durationMin * 60 * 1000;

  const { mash } = useTimerContext();
  const { timeLeft, isRunning, start, pause, resume, reset } = mash;
  const paused = !isRunning;

  useEffect(() => {
    setupMashNotificationChannel();
  }, []);

  useEffect(() => {
    reset(); // only clear timer state
  }, [stepIndex]);

  const formatTimeLeft = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getDisplayTime = () => {
    if (isRunning || timeLeft > 0) {
      return formatTimeLeft(timeLeft);
    }
    return "0:00";
  };

  const getNotificationSteps = () =>
    // Map steps to include title and offsetMinutes for notifications
    steps.map((step, idx) => ({
      ...step,
      // Use a fallback title since MashStep has no 'title' property
      title: `Schritt ${idx + 1}`,
      offsetMinutes: steps
        .slice(0, idx)
        .reduce((sum, s) => sum + (parseInt(s.duration || "0") || 0), 0),
    }));

  const handleTogglePause = async () => {
    const now = Date.now();

    if (!isRunning) {
      if (timeLeft > 0 && timeLeft < durationMs) {
        await resume(); // 🔁 Resume

        // 🔁 Schedule just the current step's notification
        if (Device.isDevice) {
          const stepsToReschedule = getNotificationSteps().filter(
            (_, idx) => idx === stepIndex
          );

          await cancelMashNotifications(stepsToReschedule);
          await scheduleMashNotifications(stepsToReschedule, now + timeLeft);
        }
      } else {
        await start(durationMs); // ▶️ First start

        // ⏱ Schedule all upcoming mash step notifications
        if (Device.isDevice) {
          await scheduleMashNotifications(getNotificationSteps(), now);
        }
      }
    } else {
      await pause(); // ⏸ Pause
      if (Device.isDevice) {
        const notifee = await loadNotifee();
        if (notifee) await notifee.default.cancelAllNotifications();
      }
    }
  };

  const handleReset = async () => {
    await reset();
    await cancelMashNotifications(getNotificationSteps());
  };

  const nextStep = () => setStepIndex((prev) => prev + 1);

  const goToBoil = () =>
    router.push({
      pathname: "/brewflow/[id]/boil",
      params: { id, targetSize },
    });

  // Detect first load: no timer ever started, and no time elapsed
  const isFirstStart = timeLeft === 0;
  const effectiveTime = Math.max(timeLeft, 0); //isRunning || timeLeft > 0 ? timeLeft : durationMs;
  const circleFill = (effectiveTime / durationMs) * 100;

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
            { marginTop: 20, opacity: mash.isRunning ? 0.5 : 1 },
          ]}
          onPress={nextStep}
          disabled={mash.isRunning}
        >
          <Text style={styles.buttonText}>Nächster Schritt</Text>
        </Pressable>
      )}

      {!isRunning && timeLeft <= 0 && stepIndex === steps.length - 1 && (
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
            opacity: mash.isRunning ? 0.5 : 1,
          },
        ]}
        onPress={goToBoil}
        disabled={mash.isRunning}
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
