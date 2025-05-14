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
      ...(theme === "dark" ? NavigationDarkTheme.colors : NavigationLightTheme.colors),
      ...appTheme.colors,
    },
  };

  return (
    <PaperProvider theme={appTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal/brew"
            options={{ presentation: "modal", title: "Brautag" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </NavigationThemeProvider>
    </PaperProvider>
  );
}

