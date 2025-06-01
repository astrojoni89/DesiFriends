import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
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

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Snackbar, Tooltip } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { useValidation } from "@/hooks/useValidation";
import { useLocalSearchParams } from "expo-router";

// Updated RecipesScreen to highlight missing name, batchSize, and ingredient lists on validation
export default function RecipesScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipeById, updateRecipe } = useRecipes();

  const existing = getRecipeById(id!);

  const [recipeName, setRecipeName] = useState(existing?.name ?? "");
  const [batchSize, setBatchSize] = useState(
    existing?.batchSize != null ? existing.batchSize.toString() : ""
  );
  const [hauptguss, setHauptguss] = useState(
    existing?.hauptguss != null ? existing.hauptguss.toString() : ""
  );
  const [nachguss, setNachguss] = useState(
    existing?.nachguss != null ? existing.nachguss.toString() : ""
  );

  const [malzList, setMalzList] = useState(existing?.malz ?? []);
  const [hopfenList, setHopfenList] = useState(existing?.hopfen ?? []);
  const [hefeList, setHefeList] = useState(existing?.hefe ?? []);

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

  //const { addRecipe } = useRecipes();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(theme.colors);

  const [modalVisible, setModalVisible] = useState(false);

  // Validation
  type RecipeForm = {
    name: string;
    batchSize: string;
    hauptguss: string;
    nachguss: string;
    malzList: Ingredient[];
    hopfenList: HopIngredient[];
    hefeList: Ingredient[];
  };

  const initialValues: RecipeForm = {
    name: existing?.name ?? "",
    batchSize: existing?.batchSize != null ? existing.batchSize.toString() : "",
    hauptguss: existing?.hauptguss != null ? existing.hauptguss.toString() : "",
    nachguss: existing?.nachguss != null ? existing.nachguss.toString() : "",
    malzList: existing?.malz ?? [],
    hopfenList: existing?.hopfen ?? [],
    hefeList: existing?.hefe ?? [],
  };

  const validationRules = {
    name: (value: string) => (!value ? "Name is required" : null),
    batchSize: (value: string) => (!value ? "Batch size is required" : null),
    hauptguss: (value: string) =>
      !value ? "Main water volume is required" : null,
    nachguss: (value: string) => (!value ? "Sparge volume is required" : null),
    malzList: (value: Ingredient[]) =>
      value.length === 0 ? "At least one malt is required" : null,
    hopfenList: (value: HopIngredient[]) =>
      value.length === 0 ? "At least one hop is required" : null,
    hefeList: (value: Ingredient[]) =>
      value.length === 0 ? "At least one yeast is required" : null,
  };

  const { values, errors, handleChange, validate, setValues, setErrors } =
    useValidation<RecipeForm>(initialValues, validationRules);

  const [mashSteps, setMashSteps] = useState(existing?.mashSteps ?? []);
  const [boilTime, setBoilTime] = useState(existing?.boilTime ?? "");
  const [hopSchedule, setHopSchedule] = useState(existing?.hopSchedule ?? []);

  const addIngredient = (
    input: Ingredient | HopIngredient,
    list: Ingredient[] | HopIngredient[],
    setter: Function,
    resetter: Function,
    key: keyof RecipeForm
  ) => {
    // Generic check for missing fields
    const isHop = key === "hopfenList";
    const hasEmptyFields =
      !input.name ||
      !input.amount ||
      (isHop && !(input as HopIngredient).alphaAcid);

    if (hasEmptyFields) return;

    const updatedList = [...list, input];
    setter(updatedList);
    handleChange(key, updatedList);

    resetter(
      isHop ? { name: "", amount: "", alphaAcid: "" } : { name: "", amount: "" }
    );
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
      hauptguss: parseFloat(values.hauptguss),
      nachguss: parseFloat(values.nachguss),
      malz: values.malzList,
      hopfen: values.hopfenList,
      hefe: values.hefeList,
      mashSteps,
      boilTime,
      hopSchedule,
    };
    //addRecipe(newRecipe);
    updateRecipe(id!, {
      name: values.name,
      batchSize: parseFloat(values.batchSize),
      hauptguss: parseFloat(values.hauptguss),
      nachguss: parseFloat(values.nachguss),
      malz: values.malzList,
      hopfen: values.hopfenList,
      hefe: values.hefeList,
      mashSteps,
      boilTime,
      hopSchedule,
    });

    setMashSteps([]);
    setBoilTime("");
    setHopSchedule([]);
    setMalzList([]);
    setHopfenList([]);
    setHefeList([]);
    setValues(initialValues);
    setErrors({});

    setShowSavedMessage(true);
    // wait for 2 seconds before router.back()
    setTimeout(() => {
      router.back();
    }, 2000);
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
      hauptguss: parseFloat(values.hauptguss),
      nachguss: parseFloat(values.nachguss),
      malz: values.malzList,
      hopfen: values.hopfenList,
      hefe: values.hefeList,
    };
    //addRecipe(newRecipe);
    updateRecipe(id!, {
      name: values.name,
      batchSize: parseFloat(values.batchSize),
      hauptguss: parseFloat(values.hauptguss),
      nachguss: parseFloat(values.nachguss),
      malz: values.malzList,
      hopfen: values.hopfenList,
      hefe: values.hefeList,
      mashSteps,
      boilTime,
      hopSchedule,
    });
    setValues(initialValues);
    setErrors({});
    router.push({ pathname: "/modal/schedule", params: { id } });
  };

  const importRecipe = async () => {
    try {
      // const result = await DocumentPicker.getDocumentAsync({
      //   type: "application/json",
      // });
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "application/octet-stream"], // allow unknown MIME types too
      });

      if (result.canceled || !result.assets || !result.assets[0]?.uri) return;

      const fileUri = result.assets[0].uri;
      const contents = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(contents);

      if (!fileUri.endsWith(".json") && !fileUri.endsWith(".dfr")) {
        Alert.alert(
          "Fehler",
          "Bitte wähle eine gültige Rezeptdatei (.json oder .dfr)."
        );
        return;
      }

      if (!data || typeof data !== "object" || !data.recipe) {
        Alert.alert("Fehler", "Die Datei enthält kein gültiges Rezept.");
        return;
      }

      // Optional: sanitize ID to avoid collisions
      const importedRecipe = {
        ...data.recipe,
        id: Date.now().toString(),
        batchSize: data.recipe.batchSize ?? 0,
        hauptguss: data.recipe.hauptguss ?? 0,
        nachguss: data.recipe.nachguss ?? 0,
        malz: data.recipe.malz ?? [],
        hopfen: data.recipe.hopfen ?? [],
        hefe: data.recipe.hefe ?? [],
      };

      //addRecipe(importedRecipe);
      updateRecipe(id!, {
        name: values.name,
        batchSize: parseFloat(values.batchSize),
        hauptguss: parseFloat(values.hauptguss),
        nachguss: parseFloat(values.nachguss),
        malz: values.malzList,
        hopfen: values.hopfenList,
        hefe: values.hefeList,
        mashSteps,
        boilTime,
        hopSchedule,
      });

      Alert.alert("Erfolg", "Rezept erfolgreich importiert!");
    } catch (error) {
      console.error("Import Error:", error);
      Alert.alert("Fehler", "Rezept konnte nicht importiert werden.");
    }
  };

  const [showSavedMessage, setShowSavedMessage] = useState(false);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          borderRadius: 12,
          elevation: 5,
        }}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Rezept bearbeiten</Text>
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
              placeholder="Zielmenge (Liter)"
              keyboardType="numeric"
              value={values.batchSize}
              onChangeText={(text) => handleChange("batchSize", text)}
              placeholderTextColor={colors.outline}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <TextInput
                style={[
                  styles.input,
                  { flex: 1 },
                  errors.hauptguss && { borderColor: "red", borderWidth: 2 },
                ]}
                placeholder="Hauptguss (Liter)"
                keyboardType="decimal-pad"
                value={values.hauptguss}
                onChangeText={(text) => handleChange("hauptguss", text)}
                placeholderTextColor={colors.outline}
              />
              <TextInput
                style={[
                  styles.input,
                  { flex: 1 },
                  errors.nachguss && { borderColor: "red", borderWidth: 2 },
                ]}
                placeholder="Nachguss (Liter)"
                keyboardType="decimal-pad"
                value={values.nachguss}
                onChangeText={(text) => handleChange("nachguss", text)}
                placeholderTextColor={colors.outline}
              />
            </View>

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
            {/* {malzList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              &bull; {item.name}: {item.amount} kg
            </Text>
          ))} */}
            {malzList.map((item, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={[styles.ingredientItem, { flex: 1 }]}>
                  &bull; {item.name}: {item.amount} kg
                </Text>
                <Pressable
                  onPress={() => {
                    const updated = malzList.filter((_, i) => i !== idx);
                    setMalzList(updated);
                    handleChange("malzList", updated);
                  }}
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.remove },
                  ]}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </Pressable>
              </View>
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
            {/* {hopfenList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              &bull; {item.name}: {item.amount} g @ {item.alphaAcid}%α
            </Text>
          ))} */}
            {hopfenList.map((item, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={[styles.ingredientItem, { flex: 1 }]}>
                  &bull; {item.name}: {item.amount} g @ {item.alphaAcid}%α
                </Text>
                <Pressable
                  onPress={() => {
                    const updated = hopfenList.filter((_, i) => i !== idx);
                    setHopfenList(updated);
                    handleChange("hopfenList", updated);
                  }}
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.remove },
                  ]}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </Pressable>
              </View>
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
            {/* {hefeList.map((item, idx) => (
            <Text key={idx} style={styles.ingredientItem}>
              &bull; {item.name}: {item.amount} g
            </Text>
          ))} */}
            {hefeList.map((item, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={[styles.ingredientItem, { flex: 1 }]}>
                  &bull; {item.name}: {item.amount} g
                </Text>
                <Pressable
                  onPress={() => {
                    const updated = hefeList.filter((_, i) => i !== idx);
                    setHefeList(updated);
                    handleChange("hefeList", updated);
                  }}
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.remove },
                  ]}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </Pressable>
              </View>
            ))}

            <View style={{ marginTop: 16, marginBottom: 64 }}>
              <Pressable onPress={handleAddRecipe} style={styles.brewButton}>
                <Text style={styles.brewButtonText}>Änderungen speichern</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Snackbar
          visible={showSavedMessage}
          onDismiss={() => setShowSavedMessage(false)}
          duration={2000}
          style={{
            backgroundColor: colors.primary,
            position: "absolute",
            bottom: 48,
            left: 16,
            right: 16,
            borderRadius: 8,
          }}
        >
          Rezept gespeichert!
        </Snackbar>
        <View style={{ marginBottom: 32 }}></View>
      </View>
    </TouchableWithoutFeedback>
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
    removeButton: {
      height: 32,
      width: 32,
      borderRadius: 8,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
      marginRight: 8,
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
    iconButton: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    ingredientRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
  });
}
// recipe index.tsx, 22/05/2025
