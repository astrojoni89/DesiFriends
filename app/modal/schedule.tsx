import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Menu, Snackbar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { AppTheme } from "@/theme/theme";
import { useRecipes } from "@/context/RecipeContext";
import { estimateIBU, platoToSG } from "@/utils/calcUtils";

export default function MashScheduleModal() {
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getRecipeById, addRecipe } = useRecipes();

  const recipe = getRecipeById(id as string);
  const [mashSteps, setMashSteps] = useState(recipe?.mashSteps || []);
  const [newMashStep, setNewMashStep] = useState({
    temperature: "",
    duration: "",
  });
  const [boilTime, setBoilTime] = useState(recipe?.boilTime || "");
  const [expectedPlato, setExpectedPlato] = useState("12");
  const [hopSchedule, setHopSchedule] = useState(
    (recipe?.hopSchedule || []).sort(
      (a, b) => parseFloat(b.time) - parseFloat(a.time)
    )
  );
  const [newHop, setNewHop] = useState({ name: "", amount: "", time: "" });

  const [menuVisible, setMenuVisible] = useState(false);

  if (!recipe) {
    return <Text style={styles.title}>Rezept nicht gefunden.</Text>;
  }

  const hopOptions = recipe.hopfen.map((h) => h.name);

  const getMaxHopAmount = () => {
    const hop = recipe.hopfen.find((h) => h.name === newHop.name);
    if (!hop) return 0;
    const alreadyUsed = hopSchedule
      .filter((h) => h.name === hop.name)
      .reduce((sum, h) => sum + parseFloat(h.amount || "0"), 0);
    return parseFloat(hop.amount || "0") - alreadyUsed;
  };

  const maxBoilTime = parseFloat(boilTime || "0");

  const getEstimatedIBU = () => {
    const enrichedHops = hopSchedule.map((h) => ({
      ...h,
      alphaAcid:
        parseFloat(
          recipe.hopfen.find((r) => r.name === h.name)?.alphaAcid || "0"
        ) || 0,
    }));
    return estimateIBU(
      enrichedHops,
      recipe.batchSize,
      platoToSG(parseFloat(expectedPlato))
    ).toFixed(1);
  };

  const [showSavedMessage, setShowSavedMessage] = useState(false);

  return (
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>{recipe.name}</Text>

            <Text style={styles.sectionTitle}>Rasten</Text>
            {mashSteps.map((step, idx) => (
              <View key={idx} style={styles.row}>
                <Text style={[styles.ingredientItem, { flex: 1 }]}>
                  &bull; {step.temperature}°C für {step.duration} min
                </Text>
                <Pressable
                  onPress={() =>
                    setMashSteps(mashSteps.filter((_, i) => i !== idx))
                  }
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.remove },
                  ]}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </Pressable>
              </View>
            ))}

            <View style={styles.row}>
              <TextInput
                placeholder="Temperatur (°C)"
                keyboardType="decimal-pad"
                value={newMashStep.temperature}
                onChangeText={(t) =>
                  setNewMashStep({ ...newMashStep, temperature: t })
                }
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={colors.outline}
              />
              <TextInput
                placeholder="Dauer (min)"
                keyboardType="numeric"
                value={newMashStep.duration}
                onChangeText={(t) =>
                  setNewMashStep({ ...newMashStep, duration: t })
                }
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={colors.outline}
              />
              <Pressable
                style={styles.addButton}
                onPress={() => {
                  if (!newMashStep.temperature || !newMashStep.duration) return;
                  setMashSteps([...mashSteps, newMashStep]);
                  setNewMashStep({ temperature: "", duration: "" });
                }}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Würzekochen</Text>
            <TextInput
              placeholder="Kochzeit (min)"
              keyboardType="numeric"
              value={boilTime}
              onChangeText={setBoilTime}
              style={styles.input}
              placeholderTextColor={colors.outline}
            />

            <Text style={styles.sectionTitle}>
              Angepeilte Stammwürze (°Plato)
            </Text>
            <TextInput
              placeholder="z. B. 12"
              keyboardType="decimal-pad"
              value={expectedPlato}
              onChangeText={setExpectedPlato}
              style={styles.input}
              placeholderTextColor={colors.outline}
            />

            <Text style={styles.sectionTitle}>Hopfengaben</Text>
            <Text style={styles.note}>Zeitangaben beziehen sich auf Minuten vor Kochende</Text>
            {hopSchedule
              .sort((a, b) => parseFloat(b.time) - parseFloat(a.time))
              .map((hop, idx) => (
                <View key={idx} style={styles.row}>
                  <Text style={[styles.ingredientItem, { flex: 1 }]}>
                    &bull; {hop.name}, {hop.amount} g bei {hop.time} min
                  </Text>
                  <Pressable
                    onPress={() =>
                      setHopSchedule(hopSchedule.filter((_, i) => i !== idx))
                    }
                    style={[
                      styles.removeButton,
                      { backgroundColor: colors.remove },
                    ]}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </Pressable>
                </View>
              ))}

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Menu
                  style={{width: 150}}
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <Pressable
                      onPress={() => setMenuVisible(true)}
                      style={styles.input}
                    >
                      <Text
                        style={{
                          color: newHop.name ? colors.text : colors.outline,
                        }}
                      >
                        {newHop.name || "Hopfen wählen"}
                      </Text>
                    </Pressable>
                  }
                >
                  {hopOptions.map((hop, idx) => (
                    <Menu.Item
                      key={idx}
                      onPress={() => {
                        setNewHop({ ...newHop, name: hop });
                        setMenuVisible(false);
                      }}
                      title={hop}
                    />
                  ))}
                </Menu>
              </View>

              <View style={{ flex: 0.8 }}>
              <TextInput
                placeholder={`g`} //(max ${getMaxHopAmount()})
                keyboardType="decimal-pad"
                value={newHop.amount}
                onChangeText={(t) => setNewHop({ ...newHop, amount: t })}
                style={styles.input}
                placeholderTextColor={colors.outline}
              />
              </View>
              <TextInput
                placeholder={`bei min`} //(max ${boilTime || "?"} min)
                keyboardType="numeric"
                value={newHop.time}
                onChangeText={(t) => setNewHop({ ...newHop, time: t })}
                style={styles.input}
                placeholderTextColor={colors.outline}
              />
              <Pressable
                style={styles.addButton}
                onPress={() => {
                  const amt = parseFloat(newHop.amount);
                  const t = parseFloat(newHop.time);
                  if (!newHop.name || isNaN(amt) || isNaN(t)) return;
                  if (amt > getMaxHopAmount()) {
                    Alert.alert(
                      "Zuviel Hopfen",
                      `Maximal ${getMaxHopAmount()} g erlaubt.`
                    );
                    return;
                  }
                  if (maxBoilTime && t > maxBoilTime) {
                    Alert.alert(
                      "Ungültige Zeit",
                      `Maximalzeit ist ${boilTime} min.`
                    );
                    return;
                  }
                  setHopSchedule([...hopSchedule, newHop]);
                  setNewHop({ name: "", amount: "", time: "" });
                }}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>

            {hopSchedule.length > 0 && (
              <Text style={{ marginTop: 8, color: colors.outline }}>
                Geschätzte IBU: {getEstimatedIBU()}
              </Text>
            )}

            <Pressable
              style={[styles.brewButton, { marginBottom: 32 }]}
              onPress={() => {
                const updatedRecipe = {
                  ...recipe,
                  mashSteps,
                  boilTime,
                  hopSchedule,
                };
                addRecipe(updatedRecipe);
                setShowSavedMessage(true);
                // wait for 2 seconds before router.back()
                setTimeout(() => {
                  router.back();
                }, 2000);
              }}
            >
              <Text style={styles.brewButtonText}>Fertig</Text>
            </Pressable>
          </ScrollView>
          </TouchableWithoutFeedback>
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
          Maisch- & Kochplan gespeichert!
        </Snackbar>
      </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      marginBottom: 50,
      paddingTop: 32,
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 12,
      color: colors.onBackground,
    },
    sectionTitle: {
      marginTop: 12,
      marginBottom: 4,
      fontWeight: "600",
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      fontSize: 16,
      height: 48,
      borderRadius: 8,
      color: colors.text,
      marginBottom: 8,
      flex: 1,
      justifyContent: "center",
    },
    note: {
      fontSize: 12,
      color: colors.outline,
      fontStyle: "italic",
      marginBottom: 8,
      marginLeft: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
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
    ingredientItem: {
      color: colors.text,
      marginBottom: 2,
    },
    brewButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 16,
    },
    brewButtonText: {
      color: colors.onPrimary || "#fff",
      fontWeight: "600",
      fontSize: 16,
      margin: 4,
    },
  });
}
