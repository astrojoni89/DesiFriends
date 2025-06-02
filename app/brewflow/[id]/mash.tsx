// // app/brewflow/[id]/mash.tsx
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTimer } from "@/hooks/useTimer";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function MashTimerStep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id || "");
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();

  const steps = recipe?.mashSteps?.length ? recipe.mashSteps : [];
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const durationSec = parseInt(step?.duration || "0") * 60;

  const {
    timeLeft,
    minutes,
    seconds,
    paused,
    togglePause,
    reset,
  } = useTimer(durationSec);

  useEffect(() => {
    if (!step) return;

    // Auto-start timer + notification on step change
    const startStep = async () => {
      reset(true); // start immediately

      if (Device.isDevice) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Timer abgelaufen",
            body: "Der nächste Schritt kann beginnen.",
          },
          trigger: {
            seconds: durationSec,
            repeats: false,
          } as Notifications.TimeIntervalTriggerInput,
        });
      }
    };

    startStep();
  }, [stepIndex]);

  const nextStep = () => {
    setStepIndex((prev) => prev + 1);
  };

  const goToBoil = () => {
    router.push({ pathname: "/brewflow/[id]/boil", params: { id } });
  };

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
      <Text style={styles.timer}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </Text>

      {timeLeft <= 0 && stepIndex < steps.length - 1 && (
        <Pressable style={styles.button} onPress={nextStep}>
          <Text style={styles.buttonText}>Nächster Schritt</Text>
        </Pressable>
      )}

      {timeLeft <= 0 && stepIndex === steps.length - 1 && (
        <Pressable style={styles.button} onPress={goToBoil}>
          <Text style={styles.buttonText}>Kochen starten</Text>
        </Pressable>
      )}

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

      <Pressable
        style={[
          styles.button,
          { backgroundColor: colors.secondary, marginTop: 20 },
        ]}
        onPress={goToBoil}
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
