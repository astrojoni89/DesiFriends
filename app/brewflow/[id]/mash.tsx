// app/brewflow/[id]/mash.tsx
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AppState,
  AppStateStatus,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import type { NotificationRequestInput } from "expo-notifications";
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { Icon, useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { Ionicons } from "@expo/vector-icons";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // required in SDK 50+
    shouldShowList: true, // required in SDK 50+
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
  const [endTime, setEndTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const appState = useRef(AppState.currentState);

  const step = steps[stepIndex];
  const [paused, setPaused] = useState(false);

  // Set up app state listener to re-sync timer
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      setNow(Date.now()); // Resync timer
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    if (!step) return;

    const schedule = async () => {
      const durationSec = parseInt(step.duration) * 60;
      const targetEndTime = Date.now() + durationSec * 1000;
      setEndTime(targetEndTime);
      setNow(Date.now());

      // Schedule a notification
      if (Device.isDevice) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Timer abgelaufen",
            body: "Der nächste Schritt kann beginnen.",
          },
          trigger: {
            seconds: 10,
            repeats: false,
          } as Notifications.TimeIntervalTriggerInput,
        });
      }
    };

    schedule();
  }, [stepIndex]);

  useEffect(() => {
    if (!endTime || paused) return;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [endTime, paused]);

  if (!recipe || steps.length === 0 || !step) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keine Rasten gefunden</Text>
        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({ pathname: "/brewflow/[id]/boil", params: { id } })
          }
        >
          <Text style={styles.buttonText}>Zum Kochen springen</Text>
        </Pressable>
      </View>
    );
  }

  const timeLeft =
    endTime && !paused
      ? Math.max(0, Math.floor((endTime - now) / 1000))
      : Math.max(0, Math.floor((endTime ?? now) - now) / 1000); // fallback during pause

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const nextStep = () => {
    setStepIndex((prev) => prev + 1);
  };

  const goToBoil = () => {
    router.push({ pathname: "/brewflow/[id]/boil", params: { id } });
  };

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

      <Pressable
        style={styles.iconButton}
        onPress={() => setPaused((prev) => !prev)}
      >
        <Ionicons
          name={paused ? "play" : "pause"}
          size={28}
          color={colors.onPrimary}
        />
      </Pressable>

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
