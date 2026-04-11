import { Stack } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { RecipeProvider } from "../context/RecipeContext";
import { Provider as PaperProvider } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useThemeContext } from "@/context/ThemeContext";
import { DeleteModeProvider } from "@/context/DeleteModeContext";
import { TimerProvider } from "@/context/TimerContext";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system";
import { useTimerContext } from "@/context/TimerContext";
import { useRecipes } from "../context/RecipeContext";
import { Pressable, Text, StyleSheet, View as RNView, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, Snackbar, Portal } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { loadNotifee } from "@/utils/notifeeWrapper";

// Register the Notifee background event handler at module level (before React
// mounts) so it can handle notification actions even when the app is killed.
// Guarded by the Expo Go check since @notifee/react-native is unavailable there.
if (Constants.executionEnvironment !== "storeClient") {
  const notifee = require("@notifee/react-native");
  const { EventType } = notifee;

  notifee.default.onBackgroundEvent(async ({ type, detail }: any) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "hop_added") {
      // Dismiss the tapped notification.
      if (detail.notification?.id) {
        await notifee.default.cancelNotification(detail.notification.id);
      }

      // Resume the boil timer directly in AsyncStorage so it keeps running
      // while the app is still closed or backgrounded.
      const saved = await AsyncStorage.getItem("activeTimer-boil");
      if (saved) {
        const timer = JSON.parse(saved);
        if (timer.paused) {
          await AsyncStorage.setItem(
            "activeTimer-boil",
            JSON.stringify({
              ...timer,
              paused: false,
              startTimestamp: Date.now(),
              duration: timer.timeLeft,
            })
          );
        }
      }
    }

    // When a hop notification is delivered while the app is in the background,
    // pause the boil timer in AsyncStorage so the user sees it paused when
    // they navigate to the boil screen via the notification.
    if (
      type === EventType.DELIVERED &&
      detail.notification?.android?.channelId === "boil-timer" &&
      detail.notification?.title === "Hopfengabe"
    ) {
      const saved = await AsyncStorage.getItem("activeTimer-boil");
      if (saved) {
        const timer = JSON.parse(saved);
        if (!timer.paused && timer.startTimestamp) {
          const hopThreshold = detail.notification?.data?.hopThresholdSeconds
            ? parseInt(detail.notification.data.hopThresholdSeconds)
            : null;
          const elapsed = Math.floor((Date.now() - timer.startTimestamp) / 1000);
          const remaining = hopThreshold ?? Math.max(0, timer.duration - elapsed);
          // Also remove this threshold from hopThresholds so that resuming after
          // confirmation doesn't immediately re-trigger the auto-pause in the tick.
          const updatedThresholds = (timer.hopThresholds as number[] | undefined)
            ?.filter((t: number) => t !== remaining) ?? [];
          await AsyncStorage.setItem(
            "activeTimer-boil",
            JSON.stringify({
              ...timer,
              paused: true,
              startTimestamp: null,
              timeLeft: remaining,
              hopThresholds: updatedThresholds,
            })
          );
        }
      }
    }
  });
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RecipeProvider>
        <DeleteModeProvider>
          <ThemeProvider>
            <AppWithTheming />
          </ThemeProvider>
        </DeleteModeProvider>
      </RecipeProvider>
    </GestureHandlerRootView>
  );
}

function AppWithTheming() {
  const { theme, appTheme } = useThemeContext();

  const navigationTheme = {
    ...(theme === "dark" ? NavigationDarkTheme : NavigationLightTheme),
    colors: {
      ...(theme === "dark"
        ? NavigationDarkTheme.colors
        : NavigationLightTheme.colors),
      ...appTheme.colors,
    },
  };

  return (
    <PaperProvider theme={appTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        <TimerProvider>
          <RNView style={{ flex: 1 }}>
            <TimerRedirector />
            <Stack>
              <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal/brew"
                options={{
                  animation: "slide_from_bottom",
                  headerShown: false,
                  gestureEnabled: true,
                  title: "Brautag",
                }}
              />
              <Stack.Screen
                name="modal/schedule"
                options={{
                  animation: "slide_from_bottom",
                  headerShown: false,
                  gestureEnabled: true,
                  title: "Maisch- & Kochplan",
                }}
              />
              <Stack.Screen
                name="modal/edit"
                options={{
                  animation: "slide_from_bottom",
                  headerShown: false,
                  gestureEnabled: true,
                  title: "Rezept bearbeiten",
                }}
              />
              <Stack.Screen
                name="modal/tools"
                options={{
                  animation: "slide_from_bottom",
                  headerShown: false,
                  gestureEnabled: true,
                  title: "Rechner",
                }}
              />
              <Stack.Screen
                name="brewflow"
                options={{
                  animation: "slide_from_right",
                  headerShown: false,
                  gestureEnabled: true,
                  title: "Brautag starten",
                }}
              />
            </Stack>
            <TimerWidget />
            <FileImportHandler />
            <StatusBar style="auto" />
          </RNView>
        </TimerProvider>
      </NavigationThemeProvider>
    </PaperProvider>
  );
}

function TimerRedirector() {
  const { mash, boil } = useTimerContext();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Pause the boil timer the moment a hop notification is delivered, even when
  // the user is on a different screen. This prevents the timer from running
  // while the user navigates to the boil screen to confirm the hop addition.
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    loadNotifee().then((notifee) => {
      if (!notifee || !active) return;
      unsubscribe = notifee.default.onForegroundEvent(({ type, detail }: any) => {
        if (
          type === notifee.EventType?.DELIVERED &&
          detail.notification?.android?.channelId === "boil-timer" &&
          detail.notification?.title === "Hopfengabe"
        ) {
          const hopThreshold = detail.notification?.data?.hopThresholdSeconds
            ? parseInt(detail.notification.data.hopThresholdSeconds)
            : undefined;
          boil.pauseTimer(hopThreshold);
        }
      });
    });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    const setup = async () => {
      const notifee = await loadNotifee();
      if (!notifee) return;
      try {
        await notifee.default.requestPermission();
        await notifee.default.createChannel({
          id: "mash-timer",
          name: "Maische-Timer",
          importance: notifee.AndroidImportance.HIGH,
        });
        await notifee.default.createChannel({
          id: "boil-timer",
          name: "Koch-Timer",
          importance: notifee.AndroidImportance.HIGH,
        });
      } catch (e) {
        console.error("Error in notifee setup:", e);
      }
    };
    setup();
  }, []);

  useEffect(() => {
    if (mash.isRestoring || boil.isRestoring) return;
    if (hasRedirected.current) return;

    hasRedirected.current = true;

    if (mash.timer?.id) {
      const recipeId = mash.timer.id.split("-")[1];
      router.replace({
        pathname: "/brewflow/[id]/mash",
        params: { id: recipeId, targetSize: mash.timer.targetSize },
      });
    } else if (boil.timer?.id) {
      const recipeId = boil.timer.id.split("-")[1];
      router.replace({
        pathname: "/brewflow/[id]/boil",
        params: { id: recipeId, targetSize: boil.timer.targetSize },
      });
    }
  }, [mash.isRestoring, boil.isRestoring, mash.timer, boil.timer]);

  return null;
}

function TimerWidget() {
  const { mash, boil, brewSession } = useTimerContext();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useTheme() as AppTheme;

  const isInBrewflow = pathname.includes("brewflow");
  const activeTimer = mash.timer ?? boil.timer;
  const isRestoring = mash.isRestoring || boil.isRestoring;

  const isMash = !!mash.timer;
  const sessionPhase = !activeTimer ? (brewSession?.phase ?? "lauter") : undefined;
  const isSessionMash = !activeTimer && sessionPhase === "mash";
  const isLauter = !activeTimer && sessionPhase === "lauter";
  const isPreBoil = !activeTimer && sessionPhase === "boil";
  const isPaused = isSessionMash || isLauter || isPreBoil ? false : isMash ? mash.isPaused() : boil.isPaused();
  const isLive = !isPaused && !!activeTimer;

  // Local interval drives display re-renders when a timer is live.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  // Pulse animation — must be before early return (hook rules).
  // Tied to isLive so it starts fresh when the timer is running and stops
  // (dot hidden) when paused, avoiding the "static dot" glitch.
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isLive) {
      pulseAnim.setValue(0);
      return;
    }
    pulseAnim.setValue(0.2);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLive]);

  // Show when outside brewflow and either a timer is running OR a brew session
  // is active (e.g. the user is on the lauter screen which has no timer).
  if (isInBrewflow || isRestoring || (!activeTimer && !brewSession)) return null;

  const label = isSessionMash ? "Maischen" : isPreBoil ? "Kochen" : isLauter ? "Läutern" : isMash ? "Maischen" : "Kochen";
  const timeDisplay = isSessionMash || isLauter || isPreBoil
    ? null
    : isMash
    ? mash.getFormattedTime()
    : boil.getFormattedTime();

  const currentTimeLeft = isMash ? mash.getTimeLeft() : boil.getTimeLeft();
  const progress = activeTimer
    ? Math.max(0, Math.min(1, 1 - currentTimeLeft / activeTimer.duration))
    : null;

  const recipeId = activeTimer ? activeTimer.id.split("-")[1] : brewSession!.recipeId;
  const targetSize = activeTimer ? activeTimer.targetSize : brewSession!.targetSize;

  const goToScreen = () => {
    if (isSessionMash) {
      router.push({ pathname: "/brewflow/[id]/mash", params: { id: recipeId, targetSize } });
    } else if (isPreBoil) {
      router.push({ pathname: "/brewflow/[id]/boil", params: { id: recipeId, targetSize } });
    } else if (isLauter) {
      router.push({ pathname: "/brewflow/[id]/lauter", params: { id: recipeId, targetSize } });
    } else if (isMash) {
      router.push({ pathname: "/brewflow/[id]/mash", params: { id: recipeId, targetSize } });
    } else {
      router.push({ pathname: "/brewflow/[id]/boil", params: { id: recipeId, targetSize } });
    }
  };

  return (
    <Pressable
      style={[widgetStyles.widget, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 56 }]}
      onPress={goToScreen}
    >
      <RNView style={widgetStyles.row}>
        <RNView style={widgetStyles.labelRow}>
          <Animated.View style={[widgetStyles.liveDot, { opacity: pulseAnim }]} />
          <Text style={widgetStyles.label}>{label}{isPaused ? " (pausiert)" : ""}</Text>
        </RNView>
        {timeDisplay && <Text style={widgetStyles.time}>{timeDisplay}</Text>}
      </RNView>
      {progress !== null && (
        <RNView style={widgetStyles.progressTrack}>
          <RNView style={[widgetStyles.progressFill, { width: `${progress * 100}%` as any }]} />
        </RNView>
      )}
    </Pressable>
  );
}

const widgetStyles = StyleSheet.create({
  widget: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD700",
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  time: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 2,
  },
});

function FileImportHandler() {
  const { addRecipe } = useRecipes();
  const router = useRouter();
  const url = Linking.useURL();
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const handled = useRef<string | null>(null);
  const theme = useTheme() as AppTheme;
  const { colors } = theme;

  useEffect(() => {
    if (!url) return;
    if (url === handled.current) return;
    if (!url.startsWith("file://") && !url.startsWith("content://")) return;

    handled.current = url;

    const doImport = async () => {
      try {
        // Copy to cache first — FileSystem.copyAsync uses Android's ContentResolver
        // under the hood and works with content:// intent URIs. Reading directly
        // via readAsStringAsync fails for those URIs; fetch() causes a native crash.
        const tempUri = (FileSystem.cacheDirectory ?? "") + "recipe_import.dfr";
        await FileSystem.copyAsync({ from: url, to: tempUri });
        const contents = await FileSystem.readAsStringAsync(tempUri);
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        const data = JSON.parse(contents);

        router.replace("/(drawer)/(tabs)/brewday" as any);

        if (!data?.recipe) {
          setSnackMessage("Ungültige Rezeptdatei.");
          return;
        }

        addRecipe({
          ...data.recipe,
          id: Date.now().toString(),
          batchSize: data.recipe.batchSize ?? 0,
          hauptguss: data.recipe.hauptguss ?? 0,
          nachguss: data.recipe.nachguss ?? 0,
          malz: data.recipe.malz ?? [],
          hopfen: data.recipe.hopfen ?? [],
          hefe: data.recipe.hefe ?? [],
        });

        setSnackMessage(`„${data.recipe.name}" erfolgreich importiert!`);
      } catch (e) {
        console.error("Failed to import .dfr file:", e);
        router.replace("/(drawer)/(tabs)/brewday" as any);
        setSnackMessage("Rezept konnte nicht importiert werden.");
      }
    };

    doImport();
  }, [url]);

  return (
    <Portal>
      <Snackbar
        visible={snackMessage !== null}
        onDismiss={() => setSnackMessage(null)}
        duration={3000}
        style={{
          backgroundColor: colors.primary,
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          borderRadius: 8,
        }}
      >
        {snackMessage ?? ""}
      </Snackbar>
    </Portal>
  );
}
