import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { createAppTheme, AppTheme } from "@/theme/theme";
import { secondaryFromPrimary } from "@/utils/colorMappings";

type ThemeType = "light" | "dark";

type ThemeContextType = {
  theme: ThemeType;
  toggleTheme: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  appTheme: AppTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "user_theme_preference";
const COLOR_KEY = "user_primary_color";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>("light");
  const [primaryColor, setPrimaryColor] = useState("#007AFF");
  const [secondaryColor, setSecondaryColor] = useState(
    secondaryFromPrimary[primaryColor] ?? "#ccc2dc"
  );

  useEffect(() => {
    (async () => {
      const storedTheme = await AsyncStorage.getItem(STORAGE_KEY);
      const storedColor = await AsyncStorage.getItem(COLOR_KEY);

      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else {
        setTheme(systemScheme === "dark" ? "dark" : "light");
      }

      if (storedColor) setPrimaryColor(storedColor);
    })();
  }, [systemScheme]);

  useEffect(() => {
    const normalized = primaryColor.toLowerCase();
    setSecondaryColor(secondaryFromPrimary[normalized] ?? "#ccc2dc");
  }, [primaryColor]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    await AsyncStorage.setItem(STORAGE_KEY, newTheme);
  };

  const handleSetPrimaryColor = async (color: string) => {
    setPrimaryColor(color);
    await AsyncStorage.setItem(COLOR_KEY, color);
  };

  const appTheme = createAppTheme(theme, primaryColor, secondaryColor);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        primaryColor,
        setPrimaryColor: handleSetPrimaryColor,
        secondaryColor,
        appTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeContext is not available");
  return ctx;
};
