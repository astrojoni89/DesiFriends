import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import uuid from "react-native-uuid";
import type { Recipe } from "@/context/RecipeContext";

function parseRecipe(contents: string): Recipe {
  const data = JSON.parse(contents.replace(/^\uFEFF/, ""));
  const recipe = data?.recipe;
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe) ||
      typeof recipe.name !== "string" || !recipe.name.trim()) {
    throw new Error("Die Datei enthält kein gültiges Rezept.");
  }
  return {
    ...recipe,
    id: String(uuid.v4()),
    batchSize: recipe.batchSize ?? 0,
    hauptguss: recipe.hauptguss ?? 0,
    nachguss: recipe.nachguss ?? 0,
    malz: recipe.malz ?? [],
    hopfen: recipe.hopfen ?? [],
    hefe: recipe.hefe ?? [],
  };
}

// Parse all entries before saving any recipes, so a bad archive cannot partially import.
export async function parseRecipeImport(contents: string, isZip: boolean): Promise<Recipe[]> {
  if (!isZip) return [parseRecipe(contents)];
  const zip = await JSZip.loadAsync(contents, { base64: true });
  const files = Object.values(zip.files).filter(file => !file.dir && /\.(dfr|json)$/i.test(file.name));
  if (!files.length) throw new Error("Das Archiv enthält keine Rezepte.");
  return Promise.all(files.map(async file => parseRecipe(await file.async("string"))));
}

export async function readRecipeImport(uri: string): Promise<Recipe[]> {
  // Android content URIs need not contain a filename or extension.
  const signature = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    position: 0,
    length: 4,
  });
  const isZip = /^(UEsDBA|UEsFBg|UEsHCA)/.test(signature);
  const contents = await FileSystem.readAsStringAsync(uri, {
    encoding: isZip ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
  });
  return parseRecipeImport(contents, isZip);
}
