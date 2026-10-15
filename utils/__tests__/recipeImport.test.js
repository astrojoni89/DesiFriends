import JSZip from "jszip";
import * as FileSystem from "expo-file-system";
import { parseRecipeImport, readRecipeImport } from "../recipeImport";

jest.mock("expo-file-system", () => ({
  EncodingType: { Base64: "base64", UTF8: "utf8" },
  readAsStringAsync: jest.fn(),
}));

const recipeJson = name => JSON.stringify({ version: 1, recipe: { id: "old-id", name, batchSize: 20 } });

beforeEach(() => jest.clearAllMocks());

test("detects a bulk export by ZIP signature even with a .dfr cache filename", async () => {
  const zip = new JSZip();
  for (let i = 0; i < 30; i++) zip.file(`recipe-${i}.dfr`, recipeJson(`Recipe ${i}`));
  zip.file("nested/OTHER.JSON", recipeJson("Other"));
  zip.file("notes.txt", "Not a recipe");
  const archive = await zip.generateAsync({ type: "base64" });
  FileSystem.readAsStringAsync.mockResolvedValueOnce("UEsDBA==").mockResolvedValueOnce(archive);
  const clock = jest.spyOn(Date, "now").mockReturnValue(1234567890);
  try {
    const recipes = await readRecipeImport("file:///cache/recipe_import.dfr");
    expect(recipes).toHaveLength(31);
    expect(new Set(recipes.map(recipe => recipe.id)).size).toBe(31);
    expect(recipes[0]).toMatchObject({ name: "Recipe 0", batchSize: 20, malz: [], hauptguss: 0 });
    expect(FileSystem.readAsStringAsync).toHaveBeenLastCalledWith("file:///cache/recipe_import.dfr", { encoding: "base64" });
  } finally {
    clock.mockRestore();
  }
});

test("reads a single recipe without a filename extension", async () => {
  FileSystem.readAsStringAsync.mockResolvedValueOnce("eyJ2ZQ==").mockResolvedValueOnce(recipeJson("Pils"));
  const recipes = await readRecipeImport("file:///cache/12345");
  expect(recipes).toHaveLength(1);
  expect(recipes[0].name).toBe("Pils");
  expect(FileSystem.readAsStringAsync).toHaveBeenLastCalledWith("file:///cache/12345", { encoding: "utf8" });
});

test("rejects an archive with a malformed recipe before returning anything to save", async () => {
  const zip = new JSZip();
  zip.file("valid.dfr", recipeJson("Pils"));
  zip.file("invalid.dfr", "broken JSON");
  await expect(parseRecipeImport(await zip.generateAsync({ type: "base64" }), true)).rejects.toThrow();
});

test("rejects empty archives and invalid single recipes", async () => {
  const empty = await new JSZip().generateAsync({ type: "base64" });
  await expect(parseRecipeImport(empty, true)).rejects.toThrow("keine Rezepte");
  await expect(parseRecipeImport('{"recipe":{}}', false)).rejects.toThrow("kein gültiges Rezept");
});
