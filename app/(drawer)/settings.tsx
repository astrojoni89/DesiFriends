import { View, Text, StyleSheet } from "react-native";
import { Switch, useTheme } from "react-native-paper";
import { useThemeContext } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import type { AppTheme } from "@/theme/theme";

export default function SettingsScreen() {
  const { theme: themeMode, toggleTheme } = useThemeContext();
  const isDark = themeMode === "dark";

  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>
      <View style={styles.row}>
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={24}
          color={isDark ? colors.outline : "#ffd700"}
          style={styles.icon}
        />
        <Text style={styles.label}>Dunkles Design</Text>
        <View style={{ flex: 1 }} />
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 32,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 24,
      color: colors.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    icon: {
      marginRight: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
  });
}
