import { Text, type StyleProp, type TextStyle } from "react-native";
import type { Recipe } from "@/context/RecipeContext";
import { formatAdditionalAmount, scaleAdditionalIngredients } from "@/utils/recipeExtras";

export function RecipeExtras({ recipe, factor = 1, titleStyle, textStyle }: {
  recipe: Recipe;
  factor?: number;
  titleStyle: StyleProp<TextStyle>;
  textStyle: StyleProp<TextStyle>;
}) {
  const ingredients = scaleAdditionalIngredients(recipe.additionalIngredients, factor);
  return <>
    {ingredients.length > 0 && <>
      <Text style={titleStyle}>Weitere Zutaten</Text>
      {ingredients.map((ingredient, index) => <Text key={index} style={textStyle}>
        • {ingredient.name}: {formatAdditionalAmount(ingredient.amount)} {ingredient.unit}
      </Text>)}
    </>}
    {!!recipe.notes?.trim() && <>
      <Text style={titleStyle}>Notizen</Text>
      <Text style={textStyle}>{recipe.notes}</Text>
    </>}
  </>;
}
