import { useRouter } from "expo-router";
import { useState, useImperativeHandle, forwardRef, ForwardedRef } from "react";
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
import { useTheme, Snackbar } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { useValidation } from "@/hooks/useValidation";

// Updated RecipesScreen to highlight missing name, batchSize, and ingredient lists on validation
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

  const { addRecipe } = useRecipes();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(theme.colors);

  const [modalVisible, setModalVisible] = useState(false);

  // Validation
  type RecipeForm = {
    name: string;
    batchSize: string;
    malzList: Ingredient[];
    hopfenList: HopIngredient[];
    hefeList: Ingredient[];
  };

  const initialValues: RecipeForm = {
    name: "",
    batchSize: "",
    malzList: [],
    hopfenList: [],
    hefeList: [],
  };

  const validationRules = {
    name: (value: string) => (!value ? "Name is required" : null),
    batchSize: (value: string) => (!value ? "Batch size is required" : null),
    malzList: (value: Ingredient[]) =>
      value.length === 0 ? "At least one malt is required" : null,
    hopfenList: (value: HopIngredient[]) =>
      value.length === 0 ? "At least one hop is required" : null,
    hefeList: (value: Ingredient[]) =>
      value.length === 0 ? "At least one yeast is required" : null,
  };

  const { values, errors, handleChange, validate, setValues, setErrors } =
    useValidation<RecipeForm>(initialValues, validationRules);

  const [mashSteps, setMashSteps] = useState<MashStep[]>([]);
  const [boilTime, setBoilTime] = useState("");
  const [hopSchedule, setHopSchedule] = useState<HopSchedule[]>([]);

  const addIngredient = (
    input: Ingredient,
    list: Ingredient[],
    setter: Function,
    resetter: Function,
    key: keyof RecipeForm
  ) => {
    if (!input.name || !input.amount) return;
    const updatedList = [...list, input];
    setter(updatedList);
    handleChange(key, updatedList);
    resetter({ name: "", amount: "" });
  };

  const handleAddRecipe = () => {
    handleChange("malzList", malzList);
    handleChange("hopfenList", hopfenList);
    handleChange("hefeList", hefeList);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    const newRecipe: Recipe = {
      id: Date.now().toString(),
      name: values.name,
      batchSize: parseFloat(values.batchSize),
      malz: values.malzList,
      hopfen: values.hopfenList,
      hefe: values.hefeList,
      mashSteps,
      boilTime,
      hopSchedule,
    };
    addRecipe(newRecipe);

    setMashSteps([]);
    setBoilTime("");
    setHopSchedule([]);
    setMalzList([]);
    setHopfenList([]);
    setHefeList([]);
    setValues(initialValues);
    setErrors({});

    setShowSavedMessage(true);
  };

  const handleSaveAndOpenModal = () => {
    handleChange("malzList", malzList);
    handleChange("hopfenList", hopfenList);
    handleChange("hefeList", hefeList);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    const id = Date.now().toString();
    const newRecipe: Recipe = {
      id,
      name: values.name,
      batchSize: parseFloat(values.batchSize),
      malz: values.malzList,
      hopfen: values.hopfenList,
      hefe: values.hefeList,
    };
    addRecipe(newRecipe);
    setValues(initialValues);
    setErrors({});
    router.push({ pathname: "/modal/schedule", params: { id } });
  };

  const [showSavedMessage, setShowSavedMessage] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setErrors({});
        }}
      > */}
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setErrors({});
        }}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Rezept erstellen</Text>

          <TextInput
            style={[
              styles.input,
              errors.name && { borderColor: "red", borderWidth: 2 },
            ]}
            placeholder="Rezeptname"
            value={values.name}
            onChangeText={(text) => handleChange("name", text)}
            placeholderTextColor={colors.outline}
          />

          <TextInput
            style={[
              styles.input,
              errors.batchSize && { borderColor: "red", borderWidth: 2 },
            ]}
            placeholder="Menge (Liter)"
            keyboardType="numeric"
            value={values.batchSize}
            onChangeText={(text) => handleChange("batchSize", text)}
            placeholderTextColor={colors.outline}
          />

          {/* Malz section */}
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
                addIngredient(
                  malzInput,
                  malzList,
                  setMalzList,
                  setMalzInput,
                  "malzList"
                )
              }
              colors={theme.colors}
              amountPlaceholder="Menge (kg)"
              showErrors={!!errors.malzList}
            />
          </View>
          {malzList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              &bull; {item.name}: {item.amount} kg
            </Text>
          ))}

          {/* Hopfen section */}
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
              onAdd={() =>
                addIngredient(
                  hopfenInput,
                  hopfenList,
                  setHopfenList,
                  setHopfenInput,
                  "hopfenList"
                )
              }
              colors={theme.colors}
              amountPlaceholder="Menge (g)"
              extraField={{
                key: "alphaAcid",
                placeholder: "%α",
                keyboardType: "decimal-pad",
              }}
              showErrors={!!errors.hopfenList}
            />
          </View>
          {hopfenList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              &bull; {item.name}: {item.amount} g @ {item.alphaAcid}%α
            </Text>
          ))}

          {/* Hefe section */}
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
                addIngredient(
                  hefeInput,
                  hefeList,
                  setHefeList,
                  setHefeInput,
                  "hefeList"
                )
              }
              colors={theme.colors}
              amountPlaceholder="Menge (g)"
              showErrors={!!errors.hefeList}
            />
          </View>
          {hefeList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              &bull; {item.name}: {item.amount} g
            </Text>
          ))}

          <View style={{ marginVertical: 16 }}>
            <Pressable
              onPress={handleSaveAndOpenModal}
              style={[styles.brewButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={styles.brewButtonText}>Maisch- & Kochplan</Text>
            </Pressable>
            <Pressable onPress={handleAddRecipe} style={styles.brewButton}>
              <Text style={styles.brewButtonText}>Rezept speichern</Text>
            </Pressable>
          </View>
        </ScrollView>
        {/* </TouchableWithoutFeedback> */}
      </Pressable>
      <Snackbar
        visible={showSavedMessage}
        onDismiss={() => setShowSavedMessage(false)}
        duration={2000}
        style={{
          backgroundColor: colors.primary,
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          borderRadius: 8,
        }}
      >
        Rezept gespeichert!
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

function IngredientInput({
  input,
  setInput,
  onAdd,
  colors,
  amountPlaceholder = "Menge",
  extraField,
  showErrors = false,
}: {
  input: any;
  setInput: Function;
  onAdd: () => void;
  colors: AppTheme["colors"];
  amountPlaceholder?: string;
  extraField?: {
    key: string;
    placeholder: string;
    keyboardType?: "default" | "numeric" | "decimal-pad";
  };
  showErrors?: boolean;
}) {
  const theme = useTheme() as AppTheme;
  const styles = createStyles(theme.colors);
  const hasError = (key: string) => showErrors && !input[key];

  return (
    <View style={styles.row}>
      <TextInput
        style={[
          styles.input,
          { flex: 2 },
          hasError("name") && { borderColor: "red", borderWidth: 2 },
        ]}
        placeholder="Name"
        value={input.name}
        onChangeText={(text) => setInput({ ...input, name: text })}
        placeholderTextColor={colors.outline || "#888"}
      />
      <TextInput
        style={[
          styles.input,
          { flex: 2 },
          hasError("amount") && { borderColor: "red", borderWidth: 2 },
        ]}
        placeholder={amountPlaceholder}
        value={input.amount}
        onChangeText={(text) => setInput({ ...input, amount: text })}
        placeholderTextColor={colors.outline || "#888"}
        keyboardType="decimal-pad"
      />
      {extraField && (
        <TextInput
          style={[
            styles.input,
            { flex: 1 },
            hasError(extraField.key) && { borderColor: "red", borderWidth: 2 },
          ]}
          placeholder={extraField.placeholder}
          value={input[extraField.key]}
          onChangeText={(text) =>
            setInput({ ...input, [extraField.key]: text })
          }
          placeholderTextColor={colors.outline || "#888"}
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
  return StyleSheet.create({
    container: {
      paddingTop: 32,
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.onBackground,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      fontSize: 16,
      height: 48, // explicitly set input height
      borderRadius: 8,
      color: colors.text,
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
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    sectionTitle: {
      marginTop: 12,
      marginBottom: 4,
      fontWeight: "600",
      color: colors.text,
    },
    ingredientItem: {
      color: colors.text,
      marginBottom: 2,
    },
    recipeBox: {
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    recipeTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    brewButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    brewButtonText: {
      color: colors.onPrimary || "#fff",
      fontWeight: "600",
      fontSize: 16,
      margin: 4,
    },
  });
}
// recipe index.tsx, 22/05/2025