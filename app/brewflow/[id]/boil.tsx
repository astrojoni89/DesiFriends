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
import {
  scheduleBoilNotifications,
  cancelBoilNotifications,
  setupBoilNotificationChannel,
} from "@/hooks/useBoilNotifications";

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
  const boilDurationMs = boilSeconds * 1000;

  const hopSchedule = recipe?.hopSchedule || [];

  const scaleFactor =
    recipe && recipe.batchSize && targetSize
      ? parseFloat(targetSize) / recipe.batchSize
      : 1;

  const { boil } = useTimerContext();
  const { timeLeft, isRunning, isPaused, start, pause, resume, reset } = boil;

  useEffect(() => {
    setupBoilNotificationChannel();
  }, []);

  const getDisplayTime = () => {
    const secs = Math.floor(effectiveTime / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getNotificationHops = () =>
    hopSchedule.map((hop) => ({
      name: hop.name,
      offsetMinutes: boilMinutes - parseInt(hop.time || "0"), // from start
    }));

  const hopsAtStart = hopSchedule.filter(
    (hop) => parseInt(hop.time) * 60 >= boilSeconds
  );

  const handleTogglePause = async () => {
    const now = Date.now();

    if (!isRunning) {
      if (timeLeft > 0 && timeLeft < boilDurationMs) {
        await resume(); // 🔁 Resume

        if (Device.isDevice) {
          // Cancel old notifications
          await cancelBoilNotifications(getNotificationHops());

          // Reschedule only the remaining ones based on timeLeft
          await scheduleBoilNotifications(
            getNotificationHops(),
            now + timeLeft,
            boilMinutes
          );
        }
      } else {
        const startBoil = async () => {
          await start(boilDurationMs); // ▶️ First start
          if (Device.isDevice) {
            await scheduleBoilNotifications(
              getNotificationHops(),
              now,
              boilMinutes
            );
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
              onPress: async () => await startBoil(),
            },
          ]);
        } else {
          await startBoil();
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
    await cancelBoilNotifications(getNotificationHops());
  };

  const isFirstStart = timeLeft === 0 && !isRunning;
  const effectiveTime = isFirstStart ? boilDurationMs : Math.max(timeLeft, 0);
  const circleFill = (effectiveTime / boilDurationMs) * 100;

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
            name={!isRunning ? "play" : "pause"}
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
