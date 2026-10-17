import { useRouter } from "expo-router";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { readRecipeImport } from "@/utils/recipeImport";

import { useRecipes } from "@/context/RecipeContext";
import { RecipeForm, RecipeFormData } from "@/components/RecipeForm";
import { useTheme, Portal, Snackbar } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export default function RecipesScreen() {
  const router = useRouter();
  const { addRecipe } = useRecipes();
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const theme = useTheme() as AppTheme;
  const { colors } = theme;

  const handleSave = (data: RecipeFormData) => {
    addRecipe({
      id: Date.now().toString(),
      name: data.name,
      batchSize: parseFloat(data.batchSize),
      hauptguss: parseFloat(data.hauptguss),
      nachguss: parseFloat(data.nachguss),
      malz: data.malz,
      hopfen: data.hopfen,
      hefe: data.hefe,
      notes: data.notes,
      additionalIngredients: data.additionalIngredients,
      mashSteps: data.mashSteps,
      boilTime: data.boilTime,
      hopSchedule: data.hopSchedule,
    });
  };

  const handleSchedule = (data: RecipeFormData) => {
    const id = Date.now().toString();
    addRecipe({
      id,
      name: data.name,
      batchSize: parseFloat(data.batchSize),
      hauptguss: parseFloat(data.hauptguss),
      nachguss: parseFloat(data.nachguss),
      malz: data.malz,
      hopfen: data.hopfen,
      hefe: data.hefe,
      notes: data.notes,
      additionalIngredients: data.additionalIngredients,
    });
    router.push({ pathname: "/modal/schedule", params: { id } });
  };

  const importRecipe = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "application/octet-stream", "application/zip"],
      });

      if (result.canceled || !result.assets || !result.assets[0]?.uri) return;

      const recipes = await readRecipeImport(result.assets[0].uri);
      recipes.forEach(addRecipe);
      setSnackMessage(`${recipes.length} Rezept${recipes.length !== 1 ? "e" : ""} importiert!`);
    } catch (error) {
      console.error("Import Error:", error);
      setSnackMessage("Rezept konnte nicht importiert werden.");
    }
  };

  return (
    <>
      <RecipeForm
        title="Rezept erstellen"
        onSave={handleSave}
        showScheduleButton
        onSchedule={handleSchedule}
        onImport={importRecipe}
      />
      <Portal>
        <Snackbar
          visible={snackMessage !== null}
          onDismiss={() => setSnackMessage(null)}
          duration={3000}
          style={{
          backgroundColor: colors.primary,
          margin: 16,
          borderRadius: 8,
        }}
        >
          {snackMessage ?? ""}
        </Snackbar>
      </Portal>
    </>
  );
}
