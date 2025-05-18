import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";

import {
  useRecipes,
  Recipe,
  Ingredient,
  HopIngredient,
  MashStep,
  HopSchedule,
} from "@/context/RecipeContext";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export default function RecipesScreen() {
  const router = useRouter();
  const [recipeName, setRecipeName] = useState("");
  const [batchSize, setBatchSize] = useState("");

  const [malzList, setMalzList] = useState<Ingredient[]>([]);
  const [hopfenList, setHopfenList] = useState<HopIngredient[]>([]);
  const [hefeList, setHefeList] = useState<Ingredient[]>([]);

  const [malzInput, setMalzInput] = useState<Ingredient>({
    name: "",
    amount: "",
  });
  const [hopfenInput, setHopfenInput] = useState<HopIngredient>({
    name: "",
    amount: "",
    alphaAcid: "",
  });
  const [hefeInput, setHefeInput] = useState<Ingredient>({
    name: "",
    amount: "",
  });

  const { recipes, addRecipe, deleteRecipe } = useRecipes();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(theme.colors);

  const [modalVisible, setModalVisible] = useState(false);

  // Process data
  const [mashSteps, setMashSteps] = useState<MashStep[]>([]);
  const [boilTime, setBoilTime] = useState("");
  const [hopSchedule, setHopSchedule] = useState<HopSchedule[]>([]);

  const addIngredient = (
    input: Ingredient,
    list: Ingredient[],
    setter: Function,
    resetter: Function
  ) => {
    if (!input.name || !input.amount) return;
    setter([...list, input]);
    resetter({ name: "", amount: "" });
  };

  // Inside RecipesScreen
  const handleAddRecipe = () => {
    if (!recipeName || !batchSize) return;
    const newRecipe: Recipe = {
      id: Date.now().toString(),
      name: recipeName,
      batchSize: parseFloat(batchSize),
      malz: malzList,
      hopfen: hopfenList,
      hefe: hefeList,
      mashSteps,
      boilTime,
      hopSchedule,
    };
    addRecipe(newRecipe); // <- call context method
    // Clear inputs
    setRecipeName("");
    setBatchSize("");
    setMalzList([]);
    setHopfenList([]);
    setHefeList([]);
  };

  const handleSaveAndOpenModal = () => {
    if (!recipeName || !batchSize) return;
    const id = Date.now().toString();
    const newRecipe: Recipe = {
      id,
      name: recipeName,
      batchSize: parseFloat(batchSize),
      malz: malzList,
      hopfen: hopfenList,
      hefe: hefeList,
    };
    addRecipe(newRecipe); // Save partial

    // Reset local state (so user can start fresh)
    setRecipeName("");
    setBatchSize("");
    setMalzList([]);
    setHopfenList([]);
    setHefeList([]);

    router.push({ pathname: "/modal/schedule", params: { id } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Rezept erstellen</Text>

          <TextInput
            style={styles.input}
            placeholder="Rezeptname"
            value={recipeName}
            onChangeText={setRecipeName}
            placeholderTextColor={colors.outline || "#888"} //{isDark ? "#aaa" : "#555"}
          />

          <TextInput
            style={styles.input}
            placeholder="Menge (Liter)"
            keyboardType="numeric"
            value={batchSize}
            onChangeText={setBatchSize}
            placeholderTextColor={colors.outline || "#888"} //{isDark ? "#aaa" : "#555"}
          />

          {/* MALZ Section */}
          <Text style={styles.sectionTitle}>Malz</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <IngredientInput
              input={malzInput}
              setInput={setMalzInput}
              onAdd={() =>
                addIngredient(malzInput, malzList, setMalzList, setMalzInput)
              }
              colors={theme.colors}
              //isDark={isDark}
              amountPlaceholder="Menge (kg)"
            />
          </View>
          {malzList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              - {item.name}: {item.amount} kg
            </Text>
          ))}

          {/* HOPFEN Section */}
          <Text style={styles.sectionTitle}>Hopfen</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <IngredientInput
              input={hopfenInput}
              setInput={setHopfenInput}
              onAdd={() => {
                if (
                  !hopfenInput.name ||
                  !hopfenInput.amount ||
                  !hopfenInput.alphaAcid
                )
                  return;
                setHopfenList([...hopfenList, hopfenInput]);
                setHopfenInput({ name: "", amount: "", alphaAcid: "" });
              }}
              colors={theme.colors}
              amountPlaceholder="Menge (g)"
              extraField={{
                key: "alphaAcid",
                placeholder: "%α",
                keyboardType: "decimal-pad",
              }}
            />
          </View>
          {hopfenList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              - {item.name}: {item.amount} g @ {item.alphaAcid}%α
            </Text>
          ))}

          {/* HEFE Section */}
          <Text style={styles.sectionTitle}>Hefe</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <IngredientInput
              input={hefeInput}
              setInput={setHefeInput}
              onAdd={() =>
                addIngredient(hefeInput, hefeList, setHefeList, setHefeInput)
              }
              colors={theme.colors}
              amountPlaceholder="Menge (g)"
            />
          </View>
          {hefeList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              - {item.name}: {item.amount} g
            </Text>
          ))}

          <View style={{ marginVertical: 16 }}>
            <Pressable onPress={handleSaveAndOpenModal} style={styles.brewButton}>
              <Text style={styles.brewButtonText}>Maisch- & Kochplan</Text>
            </Pressable>

            <Pressable onPress={handleAddRecipe} style={styles.brewButton}>
              <Text style={styles.brewButtonText}>Rezept speichern</Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function IngredientInput({
  input,
  setInput,
  onAdd,
  //isDark,
  colors,
  amountPlaceholder = "Menge",
  extraField,
}: {
  input: any;
  setInput: Function;
  onAdd: () => void;
  colors: AppTheme["colors"]; //isDark: boolean;
  amountPlaceholder?: string;
  extraField?: {
    key: string;
    placeholder: string;
    keyboardType?: "default" | "numeric" | "decimal-pad";
  };
}) {
  const theme = useTheme() as AppTheme;
  const styles = createStyles(theme.colors);

  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, { flex: 2 }]}
        placeholder="Name"
        value={input.name}
        onChangeText={(text) => setInput({ ...input, name: text })}
        placeholderTextColor={colors.outline || "#888"} //{isDark ? "#aaa" : "#555"}
      />
      <TextInput
        style={[styles.input, { flex: 2 }]}
        placeholder={amountPlaceholder}
        value={input.amount}
        onChangeText={(text) => setInput({ ...input, amount: text })}
        placeholderTextColor={colors.outline || "#888"} //{isDark ? "#aaa" : "#555"}
        keyboardType="decimal-pad"
      />
      {extraField && (
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={extraField.placeholder}
          value={input[extraField.key]}
          onChangeText={(text) =>
            setInput({ ...input, [extraField.key]: text })
          }
          placeholderTextColor={colors.outline || "#888"} //{isDark ? "#aaa" : "#555"}
          keyboardType={extraField.keyboardType || "default"}
        />
      )}
      <Pressable onPress={onAdd} style={styles.addButton}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  //isDark: boolean
  return StyleSheet.create({
    container: {
      paddingTop: 32,
      flex: 1,
      backgroundColor: colors.background, //isDark ? "#000" : "#fff"
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.onBackground, //isDark ? "#fff" : "#000"
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border, //isDark ? "#444" : "#ccc"
      backgroundColor: colors.surface, //isDark ? "#111" : "#f9f9f9"
      paddingHorizontal: 12,
      fontSize: 16,
      height: 48, // explicitly set input height
      borderRadius: 8,
      color: colors.text, //isDark ? "#fff" : "#000"
      marginBottom: 8,
      flex: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center", // vertical alignment
      gap: 8,
      marginBottom: 8,
      minHeight: 48, // makes sure inputs and button are same height
    },
    addButton: {
      height: 48,
      width: 48,
      borderRadius: 8,
      backgroundColor: colors.primary, //"#007AFF"
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    sectionTitle: {
      marginTop: 12,
      marginBottom: 4,
      fontWeight: "600",
      color: colors.text, //isDark ? "#eee" : "#333"
    },
    ingredientItem: {
      color: colors.text, //isDark ? "#ccc" : "#444"
      marginBottom: 2,
    },
    recipeBox: {
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.card, //isDark ? "#111" : "#f4f4f4"
      borderRadius: 8,
    },
    recipeTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text, //isDark ? "#fff" : "#000"
      marginBottom: 4,
    },
    brewButton: {
      backgroundColor: colors.primary, //"#007AFF"
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    brewButtonText: {
      color: colors.onPrimary || "#fff", //"#fff"
      fontWeight: "600",
      fontSize: 16,
      margin: 4,
    },
  });
}
