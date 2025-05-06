import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Ingredient = {
  name: string;
  amount: string;
};

export type HopIngredient = Ingredient & {
  alphaAcid: string;
};

export type Recipe = {
  id: string;
  name: string;
  batchSize: number;
  malz: Ingredient[];
  hopfen: HopIngredient[];
  hefe: Ingredient[];
};

type RecipeContextType = {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
};

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Load recipes from AsyncStorage on first mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const stored = await AsyncStorage.getItem("recipes");
        if (stored) {
          setRecipes(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load recipes:", error);
      }
    };
    loadRecipes();
  }, []);

  // Save recipes to AsyncStorage whenever they change
  useEffect(() => {
    const saveRecipes = async () => {
      try {
        await AsyncStorage.setItem("recipes", JSON.stringify(recipes));
      } catch (error) {
        console.error("Failed to save recipes:", error);
      }
    };
    saveRecipes();
  }, [recipes]);

  const addRecipe = (recipe: Recipe) => {
    setRecipes((prev) => [...prev, recipe]);
  };

  const deleteRecipe = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <RecipeContext.Provider value={{ recipes, addRecipe, deleteRecipe }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error("useRecipes must be used within a RecipeProvider");
  }
  return context;
};
