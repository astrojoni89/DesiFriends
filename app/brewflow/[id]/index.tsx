// app/brewflow/[id]/index.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export default function BrewStartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById } = useRecipes();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();

  const recipe = getRecipeById(id || "");

  if (!recipe) return <Text style={styles.title}>Rezept nicht gefunden</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{recipe.name}</Text>

      <Text style={styles.section}>Zielmenge</Text>
      <Text style={styles.text}>{recipe.batchSize} Liter</Text>

      <Text style={styles.section}>Maischplan</Text>
      {recipe.mashSteps?.length ? (
        recipe.mashSteps.map((step, i) => (
          <Text key={i} style={styles.text}>
            - {step.temperature}°C für {step.duration} min
          </Text>
        ))
      ) : (
        <Text style={styles.text}>Keine Angaben</Text>
      )}

      <Text style={styles.section}>Hopfengaben</Text>
      {recipe.hopSchedule?.length ? (
        recipe.hopSchedule.map((hop, i) => (
          <Text key={i} style={styles.text}>
            - {hop.name}, {hop.amount}g bei {hop.time} min
          </Text>
        ))
      ) : (
        <Text style={styles.text}>Keine Angaben</Text>
      )}

      <Pressable
        style={styles.button}
        onPress={() => router.push({ pathname: "/brewflow/[id]/mash", params: { id } })}
      >
        <Text style={styles.buttonText}>Maischen starten</Text>
      </Pressable>

    </ScrollView>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.onBackground,
      marginBottom: 16,
    },
    section: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 6,
      color: colors.text,
    },
    text: {
      fontSize: 16,
      marginBottom: 4,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 16,
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
  });
}