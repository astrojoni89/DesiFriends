import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { useRecipes } from "@/context/RecipeContext";

export default function CompleteScreen() {
  const { id, targetSize } = useLocalSearchParams<{
    id: string;
    targetSize?: string;
  }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id || "");
  const router = useRouter();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brauprozess abgeschlossen 🎉</Text>
      <Text style={styles.text}>Rezept: {recipe?.name}</Text>
      <Text style={styles.text}>Jetzt mach dir ein Bier auf 🍺</Text>

      <Pressable style={styles.button} onPress={() => router.replace("/")}>
        <Text style={styles.buttonText}>Zurück zur Übersicht</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16,
      color: colors.onBackground,
    },
    text: {
      fontSize: 18,
      marginBottom: 24,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 12,
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
  });
}
