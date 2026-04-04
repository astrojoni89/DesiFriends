import { useRouter, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { useRecipes } from "@/context/RecipeContext";
import { RecipeForm, RecipeFormData } from "@/components/RecipeForm";

export default function EditRecipeModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById, updateRecipe } = useRecipes();
  const theme = useTheme() as AppTheme;

  const existing = getRecipeById(id!);

  const handleSave = (data: RecipeFormData) => {
    updateRecipe(id!, {
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, elevation: 5 }}>
      <RecipeForm
        title="Rezept bearbeiten"
        initialValues={{
          name: existing?.name ?? "",
          batchSize: existing?.batchSize != null ? existing.batchSize.toString() : "",
          hauptguss: existing?.hauptguss != null ? existing.hauptguss.toString() : "",
          nachguss: existing?.nachguss != null ? existing.nachguss.toString() : "",
          malz: existing?.malz ?? [],
          hopfen: existing?.hopfen ?? [],
          hefe: existing?.hefe ?? [],
          mashSteps: existing?.mashSteps ?? [],
          boilTime: existing?.boilTime ?? "",
          hopSchedule: existing?.hopSchedule ?? [],
        }}
        onSave={handleSave}
        onSaved={() => router.back()}
      />
    </View>
  );
}
