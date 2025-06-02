import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import type { AppTheme } from "@/theme/theme";
import { useEffect } from "react";
import { useTimer } from "@/hooks/useTimer";

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function BoilTimer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id || "");
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();

  const boilMinutes = parseInt(recipe?.boilTime || "0");
  const boilSeconds = boilMinutes * 60;
  const hopSchedule = recipe?.hopSchedule || [];

  const { timeLeft, minutes, seconds, paused, togglePause, reset } =
    useTimer(boilSeconds);

  // Schedule hop notifications once at mount
  useEffect(() => {
    if (!Device.isDevice || !hopSchedule.length) return;

    hopSchedule.forEach(async (hop) => {
      const hopSecondsBeforeEnd = parseInt(hop.time) * 60;
      const delay = Math.max(1, boilSeconds - hopSecondsBeforeEnd);

      if (delay > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Hopfengabe",
            body: `${parseFloat(hop.amount).toFixed(1)} g ${hop.name} jetzt zugeben (${hop.time} Minuten vor Ende)!`,
          },
          trigger: {
            seconds: delay,
            repeats: false,
          } as Notifications.TimeIntervalTriggerInput,
        });
      }
    });
  }, []);

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

      <Text style={styles.timer}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable style={styles.iconButton} onPress={togglePause}>
          <Ionicons
            name={paused ? "play" : "pause"}
            size={28}
            color={colors.onPrimary}
          />
        </Pressable>

        <Pressable
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
          onPress={() => reset(false)}
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
              {parseFloat(hop.amount).toFixed(1)} g {hop.name} – {hop.time} min vor Ende
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
    timer: {
      fontSize: 48,
      fontWeight: "bold",
      marginBottom: 24,
      color: colors.primary,
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
