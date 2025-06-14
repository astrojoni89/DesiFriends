import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { loadNotifee } from "@/utils/notifeeWrapper";
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import type { AppTheme } from "@/theme/theme";
import { useEffect, useState, useCallback } from "react";
import { useTimerContext } from "@/context/TimerContext";
import { scheduleHopNotifications } from "@/hooks/useHopNotifications";

import { AnimatedCircularProgress } from "react-native-circular-progress";

export default function BoilTimer() {
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

  const boilMinutes = parseInt(recipe?.boilTime || "0");
  const boilSeconds = boilMinutes * 60;
  const hopSchedule = recipe?.hopSchedule || [];

  const scaleFactor =
    recipe && recipe.batchSize && targetSize
      ? parseFloat(targetSize) / recipe.batchSize
      : 1;

  const [stepIndex, setStepIndex] = useState(0);

  const { boil, stopAllTimers } = useTimerContext();

  const paused = boil.isPaused();
  const timeLeft = boil.getTimeLeft();

  useEffect(() => {
    boil.resetTimer(); // Clear any previous timer state when switching steps
  }, [stepIndex]);

  useEffect(() => {
    const maybeReschedule = async () => {
      if (
        Device.isDevice &&
        boil.timer &&
        !boil.timer.paused &&
        boil.timer.startTimestamp != null &&
        recipe?.hopSchedule
      ) {
        const now = Date.now();
        const elapsed = Math.floor((now - boil.timer.startTimestamp) / 1000);
        const delay = Math.max(1, boil.timer.duration - elapsed);

        await scheduleHopNotifications({
          hopSchedule: recipe.hopSchedule,
          boilSeconds: boil.timer.duration,
          scaleFactor,
          timeLeft: delay,
        });
      }
    };

    maybeReschedule();
  }, [boil.timer?.startTimestamp]);

  useEffect(() => {
    if (boil.timer && boil.timer.timeLeft <= 0) {
      router.replace({
        pathname: "/brewflow/[id]/complete",
        params: { id, targetSize },
      });
    }
  }, [boil.timer?.timeLeft]);

  const getDisplayTime = () => {
    if (!boil.timer) {
      const m = Math.floor(boilSeconds / 60);
      const s = boilSeconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    return boil.getFormattedTime();
  };

  const handleTogglePause = async () => {
    const notifee = await loadNotifee();

    if (!boil.timer) {
      const startBoil = async () => {
        await stopAllTimers(); // 🚫 clear all timers & notifications

        boil.startTimer({
          id: `boil-${id}`,
          type: "boil",
          stepIndex: 0,
          duration: boilSeconds,
          targetSize: targetSize,
        });

        if (Device.isDevice && notifee) {
          await scheduleHopNotifications({
            hopSchedule,
            boilSeconds,
            scaleFactor,
            timeLeft: boilSeconds,
          });
        }
      };

      if (hopsAtStart.length > 0) {
        const hopText = hopsAtStart
          .map(
            (hop) =>
              `${(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g ${
                hop.name
              }`
          )
          .join(", ");

        Alert.alert("Vorderwürzehopfen", hopText, [
          {
            text: "Starte Kochtimer",
            onPress: () => {
              setTimeout(() => {
                startBoil().catch((err) =>
                  console.error("Failed to start boil timer:", err)
                );
              }, 0);
            },
          },
        ]);
      } else {
        await startBoil();
      }

      return;
    }

    if (paused) {
      boil.resumeTimer();

      if (Device.isDevice && boil.timer?.startTimestamp != null && notifee) {
        const now = Date.now();
        const elapsed = Math.floor((now - boil.timer.startTimestamp) / 1000);
        const delay = Math.max(1, boil.timer.duration - elapsed);

        await scheduleHopNotifications({
          hopSchedule,
          boilSeconds: boil.timer.duration,
          scaleFactor,
          timeLeft: delay,
        });
      }
    } else {
      if (notifee) {
        await notifee.default.cancelAllNotifications();
      }
      boil.pauseTimer();
    }
  };

  const handleReset = async () => {
    await stopAllTimers();
  };

  const hopsAtStart = hopSchedule.filter(
    (hop) => parseInt(hop.time) * 60 >= boilSeconds
  );

  const total = boilSeconds;
  const timer = boil.timer;
  const circleFill = !timer && timeLeft === 0 ? 100 : (timeLeft / total) * 100;

  if (!recipe || boilMinutes <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keine Kochzeit gefunden</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kochen</Text>
      <Text style={styles.text}>Gesamtdauer: {boilMinutes} Minuten</Text>

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

      <Text style={[styles.text, { marginTop: 24 }]}>Hopfengaben:</Text>
      {hopSchedule.length > 0 ? (
        hopSchedule
          .sort((a, b) => parseInt(b.time) - parseInt(a.time))
          .map((hop, idx) => (
            <Text key={idx} style={styles.text}>
              {(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g {hop.name} –{" "}
              {hop.time} min vor Ende
            </Text>
          ))
      ) : (
        <Text style={styles.text}>Keine Hopfengaben gefunden.</Text>
      )}
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
      marginBottom: 8,
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
