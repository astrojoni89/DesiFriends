// app/brewflow/[id]/index.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export default function BrewStartScreen() {
  const { id, targetSize, actualAlphaAcids } = useLocalSearchParams<{
    id: string;
    targetSize?: string;
    actualAlphaAcids?: string;
  }>();
  const { getRecipeById } = useRecipes();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();

  const recipe = getRecipeById(id || "");

  const parsedAlphaAcids = actualAlphaAcids ? JSON.parse(actualAlphaAcids) : {};

  const scaleFactor =
    recipe && recipe.batchSize && targetSize
      ? parseFloat(targetSize) / recipe.batchSize
      : 1;

  if (!recipe) return <Text style={styles.title}>Rezept nicht gefunden</Text>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{recipe.name}</Text>

        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderRadius: 8,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingBottom: 16,
          }}
        >
          <Text style={styles.section}>Zielmenge</Text>
          <Text style={styles.text}>
            {targetSize ? parseFloat(targetSize).toFixed(1) : recipe.batchSize}{" "}
            Liter
          </Text>

          <Text style={styles.section}>Maischplan</Text>
          <Text style={styles.text}>
            Hauptguss: {(recipe.hauptguss * scaleFactor).toFixed(1)} Liter
          </Text>

          {recipe.mashSteps?.length ? (
            recipe.mashSteps.map((step, i) => (
              <Text key={i} style={[styles.text, { marginLeft: 8 }]}>
                • {step.temperature}°C für {step.duration} min
              </Text>
            ))
          ) : (
            <Text style={styles.text}>Keine Angaben der Maischeschritte</Text>
          )}

          <Text style={styles.text}>
            Nachguss: {(recipe.nachguss * scaleFactor).toFixed(1)} Liter
          </Text>

          <Text style={styles.section}>Kochzeit: {recipe.boilTime} min</Text>
          <Text style={styles.section}>Hopfengaben</Text>
          {recipe.hopSchedule?.length ? (
            // recipe.hopSchedule.map((hop, i) => (
            //   <Text key={i} style={styles.text}>
            //     • {hop.name},{" "}
            //     {(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g bei{" "}
            //     {hop.time} min
            //   </Text>
            // ))
            recipe.hopSchedule.map((hop, i) => {
              const hopIndex = recipe.hopfen.findIndex(
                (h) => h.name === hop.name
              );
              const originalAA = parseFloat(
                recipe.hopfen[hopIndex]?.alphaAcid || "0"
              );
              const actualAA = parseFloat(
                parsedAlphaAcids[hopIndex] || originalAA.toString() || "0"
              );

              let adjustedAmount = parseFloat(hop.amount) * scaleFactor;
              if (originalAA > 0 && actualAA > 0) {
                adjustedAmount *= originalAA / actualAA;
              }

              return (
                <Text key={i} style={styles.text}>
                  • {hop.name}, {adjustedAmount.toFixed(1)} g bei {hop.time} min
                </Text>
              );
            })
          ) : (
            <Text style={styles.text}>Keine Angaben</Text>
          )}
        </View>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({
              pathname: "/brewflow/[id]/mash",
              params: { id, targetSize, actualAlphaAcids: JSON.stringify(parsedAlphaAcids), },
            })
          }
        >
          <Text style={styles.buttonText}>Maischen starten</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      marginBottom: 50,
      paddingTop: 32,
    },
    content: {
      padding: 16,
      flexGrow: 1,
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
      marginTop: 32,
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
  });
}
