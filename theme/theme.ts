// theme.ts
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from "react-native-paper";

const sharedColors = {
  //primary: "#007AFF", // #5ca778 green theme, #8E44AD purple theme
  onPrimary: "#ffffff", // #ffffff
  notification: "#007AFF", // #007AFF
};

const extraLightColors = {
  background: "#ffffff", // #ffffff
  surface: "#ffffff", // #ffffff
  text: "#000000", // #000000
  card: "#f5f5f5", // #f5f5f5
  border: "#cccccc", // #cccccc
  shadow: "#000000",
};

const extraDarkColors = {
  background: "#000000", // #000000
  surface: "#121212", // #121212
  text: "#ffffff", // #ffffff
  card: "#1c1c1c", // #262626
  border: "#333333", // #333333
  shadow: "#ffffff",
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...sharedColors,
    ...extraLightColors,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...sharedColors,
    ...extraDarkColors,
  },
};

export type AppTheme = typeof lightTheme;

export const createAppTheme = (mode: "light" | "dark", primaryColor: string): AppTheme => {
  const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  const baseColors = mode === "dark" ? darkTheme.colors : lightTheme.colors;

  return {
    ...base,
    colors: {
      ...baseColors,
      primary: primaryColor,
    },
  };
};

