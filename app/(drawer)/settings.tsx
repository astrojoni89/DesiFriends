import { View, Text, StyleSheet, Pressable } from "react-native";
import { Switch, useTheme } from "react-native-paper";
import { useThemeContext } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import type { AppTheme } from "@/theme/theme";

const colorOptions = [
  { label: "Blau", color: "#007AFF" },
  { label: "Lila", color: "#8E44AD" },
  { label: "Grün", color: "#5ca778" },
];

export default function SettingsScreen() {
  const {
    theme: themeMode,
    toggleTheme,
    primaryColor,
    setPrimaryColor,
  } = useThemeContext();

  const isDark = themeMode === "dark";
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>

      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <View style={styles.iconLabelGroup}>
          <Ionicons
            name={isDark ? "moon" : "sunny"}
            size={24}
            color={isDark ? colors.outline : "#ffd700"}
            style={styles.icon}
          />
          <Text style={styles.label}>Dunkles Design</Text>
        </View>
        <View style={{marginRight: 16}}>
        <Switch value={isDark} onValueChange={toggleTheme} />
          </View>
      </View>

      <Text style={styles.subtitle}>Farbschema</Text>
      <View style={styles.colorRow}>
        {colorOptions.map(({ label, color }) => (
          <Pressable
            key={color}
            onPress={() => setPrimaryColor(color)}
            style={[
              styles.colorCircle,
              {
                backgroundColor: color,
                borderColor:
                  primaryColor === color ? colors.text : colors.outline,
                borderWidth: primaryColor === color ? 3 : 1,
              },
            ]}
          />
        ))}
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
    subtitle: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginTop: 24,
      marginBottom: 12,
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
    iconLabelGroup: {
      flexDirection: "row",
      alignItems: "center",
    },
    colorRow: {
      flexDirection: "row",
      gap: 16,
    },
    colorCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
  });
}
