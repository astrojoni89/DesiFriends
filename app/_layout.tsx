import { Stack } from "expo-router";
// import { useColorScheme } from "react-native";
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
import {
  lightTheme as PaperLightTheme,
  darkTheme as PaperDarkTheme,
} from "@/theme/theme";

const lightColors = {
  primary: "#8E44AD",
  background: "#ffffff",
  surface: "#ffffff",
  text: "#000000",
  card: "#f5f5f5",
  border: "#cccccc",
  notification: "#8E44AD",
};

const darkColors = {
  primary: "#8E44AD", //5ca778 green theme
  background: "#000000",
  surface: "#121212",
  text: "#ffffff",
  card: "#1c1c1c",
  border: "#333333",
  notification: "#8E44AD",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RecipeProvider>
        <ThemeProvider>
          <AppWithTheming />
        </ThemeProvider>
      </RecipeProvider>
    </GestureHandlerRootView>
  );
}

function AppWithTheming() {
  const { theme } = useThemeContext();

  const paperTheme = {
    ...(theme === "dark" ? PaperDarkTheme : PaperLightTheme),
    colors: {
      ...(theme === "dark" ? PaperDarkTheme.colors : PaperLightTheme.colors),
      ...(theme === "dark" ? darkColors : lightColors),
    },
  };

  const navigationTheme = {
    ...(theme === "dark" ? NavigationDarkTheme : NavigationLightTheme),
    colors: {
      ...(theme === "dark"
        ? NavigationDarkTheme.colors
        : NavigationLightTheme.colors),
      ...(theme === "dark" ? darkColors : lightColors),
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
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
