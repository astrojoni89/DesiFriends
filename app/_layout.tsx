import { Stack } from "expo-router";
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

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useTimerContext } from "@/context/TimerContext";

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

  function TimerRedirector() {
    const { mash, boil } = useTimerContext();
    const router = useRouter();

    useEffect(() => {
      const setup = async () => {
        const notifee = await loadNotifee();

        if (!notifee) {
          console.log("Notifee not loaded");
          return;
        }

        try {
          //console.log("Requesting permission...");
          await notifee.default.requestPermission();
          console.log("Permission requested!");

          //console.log("About to call createChannel for mash-timer");
          await notifee.default.createChannel({
            id: "mash-timer",
            name: "Maische-Timer",
            importance: notifee.AndroidImportance.HIGH,
          });
          console.log("Mash-timer channel created!");

          //console.log("About to call createChannel for boil-timer");
          await notifee.default.createChannel({
            id: "boil-timer",
            name: "Koch-Timer",
            importance: notifee.AndroidImportance.HIGH,
          });
          console.log("Boil-timer channel created!");
        } catch (e) {
          console.error("Error in notifee setup:", e);
        }
      };

      setup();
    }, []);

    useEffect(() => {
      if (mash.isRestoring || boil.isRestoring) return;

      if (mash.timer && !mash.timer.paused) {
        const recipeId = mash.timer.id.split("-")[1];
        router.replace(`/brewflow/${recipeId}/mash`);
      } else if (boil.timer && !boil.timer.paused) {
        const recipeId = boil.timer.id.split("-")[1];
        router.replace(`/brewflow/${recipeId}/boil`);
      }
    }, [mash.isRestoring, boil.isRestoring]);

    return null;
  }

  return (
    <PaperProvider theme={appTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        <TimerProvider>
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
              name="brewflow"
              options={{
                animation: "slide_from_right",
                headerShown: false,
                gestureEnabled: true,
                title: "Brautag starten",
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </TimerProvider>
      </NavigationThemeProvider>
    </PaperProvider>
  );
}
