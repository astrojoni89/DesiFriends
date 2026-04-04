import { Stack } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  });
}
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

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "expo-router";
import { useTimerContext } from "@/context/TimerContext";
import { Pressable, Text, StyleSheet, View as RNView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

import { loadNotifee } from "@/utils/notifeeWrapper";

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

  // Show when outside brewflow and either a timer is running OR a brew session
  // is active (e.g. the user is on the lauter screen which has no timer).
  if (isInBrewflow || isRestoring || (!activeTimer && !brewSession)) return null;

  const isMash = !!mash.timer;
  // No active timer: use the brew session phase to decide which screen to show.
  const sessionPhase = !activeTimer ? brewSession?.phase : undefined;
  const isLauter = !activeTimer && sessionPhase !== "boil";
  const isPreBoil = !activeTimer && sessionPhase === "boil";

  const label = isPreBoil ? "Kochen" : isLauter ? "Läutern" : isMash ? "Maischen" : "Kochen";
  const timeDisplay = isLauter || isPreBoil
    ? null
    : isMash
    ? mash.getFormattedTime()
    : boil.getFormattedTime();
  const isPaused = isLauter || isPreBoil ? false : isMash ? mash.isPaused() : boil.isPaused();

  const recipeId = activeTimer ? activeTimer.id.split("-")[1] : brewSession!.recipeId;
  const targetSize = activeTimer ? activeTimer.targetSize : brewSession!.targetSize;

  const goToScreen = () => {
    if (isPreBoil) {
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
        <Text style={widgetStyles.label}>{label}{isPaused ? " (pausiert)" : ""}</Text>
        {timeDisplay && <Text style={widgetStyles.time}>{timeDisplay}</Text>}
      </RNView>
    </Pressable>
  );
}

const widgetStyles = StyleSheet.create({
  widget: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
});
