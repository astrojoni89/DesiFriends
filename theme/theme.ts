// theme.ts
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from "react-native-paper";

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#007AFF",
    background: "#ffffff",
    onBackground: "#000000",
    surface: "#f2f2f2",
    onSurface: "#333333",
    outline: "#cccccc",
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#007AFF",
    background: "#000000",
    onBackground: "#ffffff",
    surface: "#111111",
    onSurface: "#dddddd",
    outline: "#444444",
  },
};
