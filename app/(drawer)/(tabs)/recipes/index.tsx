import { useRouter } from "expo-router";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
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
    });
    router.push({ pathname: "/modal/schedule", params: { id } });
  };

  const importRecipe = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "application/octet-stream"],
      });

      if (result.canceled || !result.assets || !result.assets[0]?.uri) return;

      const fileUri = result.assets[0].uri;
      const contents = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(contents);

      if (!fileUri.endsWith(".json") && !fileUri.endsWith(".dfr")) {
        setSnackMessage("Bitte wähle eine gültige Rezeptdatei (.json oder .dfr).");
        return;
      }

      if (!data || typeof data !== "object" || !data.recipe) {
        setSnackMessage("Die Datei enthält kein gültiges Rezept.");
        return;
      }

      addRecipe({
        ...data.recipe,
        id: Date.now().toString(),
        batchSize: data.recipe.batchSize ?? 0,
        hauptguss: data.recipe.hauptguss ?? 0,
        nachguss: data.recipe.nachguss ?? 0,
        malz: data.recipe.malz ?? [],
        hopfen: data.recipe.hopfen ?? [],
        hefe: data.recipe.hefe ?? [],
      });

      setSnackMessage("Rezept erfolgreich importiert!");
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
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          borderRadius: 8,
        }}
        >
          {snackMessage ?? ""}
        </Snackbar>
      </Portal>
    </>
  );
}
