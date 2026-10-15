import type { AdditionalIngredient, Recipe } from "@/context/RecipeContext";

export function scaleAdditionalIngredients(ingredients: AdditionalIngredient[] = [], factor = 1) {
  return ingredients.map(ingredient => ({ ...ingredient, amount: ingredient.amount * factor }));
}

export function formatAdditionalAmount(amount: number): string {
  return amount.toFixed(2);
}

export function recipeExtrasText(recipe: Recipe, factor = 1): string {
  const ingredients = scaleAdditionalIngredients(recipe.additionalIngredients, factor);
  return [
    ingredients.length ? `Weitere Zutaten:\n${ingredients.map(i => `• ${i.name}: ${formatAdditionalAmount(i.amount)} ${i.unit}`).join("\n")}` : "",
    recipe.notes?.trim() ? `Notizen:\n${recipe.notes}` : "",
  ].filter(Boolean).join("\n\n");
}

export function recipeExtrasHtml(recipe: Recipe, factor = 1): string {
  const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const ingredients = scaleAdditionalIngredients(recipe.additionalIngredients, factor);
  const columns = [
    ingredients.length ? `<div class="col"><h2>Weitere Zutaten</h2><ul>${ingredients.map(i => `<li>${escape(i.name)}: ${formatAdditionalAmount(i.amount)} ${escape(i.unit)}</li>`).join("")}</ul></div>` : "",
    recipe.notes?.trim() ? `<div class="col"><h2>Notizen</h2><p style="white-space: pre-wrap; overflow-wrap: anywhere">${escape(recipe.notes)}</p></div>` : "",
  ].filter(Boolean);
  return columns.length ? `<div class="row" style="border-top: 1pt dotted #999; margin-top: 20px">${columns.join("")}</div>` : "";
}
