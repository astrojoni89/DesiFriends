import { useState, useRef } from "react";
import { Recipe, useRecipes } from "@/context/RecipeContext";
import { useDeleteMode } from "@/context/DeleteModeContext";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Tooltip, Snackbar } from "react-native-paper";
import uuid from "react-native-uuid";
import type { AppTheme } from "@/theme/theme";

export default function BrewDayScreen() {
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(theme.colors);
  const { recipes, addRecipe, deleteRecipe } = useRecipes();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // const [deleteModeId, setDeleteModeId] = useState<string | null>(null);
  const { deleteModeId, setDeleteModeId } = useDeleteMode();
  const rotationAnims = useRef<{ [id: string]: Animated.Value }>({});
  const contentAnims = useRef<{ [id: string]: Animated.Value }>({});
  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id;

    // Animate chevron
    Animated.timing(rotationAnims.current[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.ease,
    }).start();

    // Animate content
    Animated.timing(contentAnims.current[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start(() => {
      // Collapse finished, now hide content logically
      if (!isExpanding) setExpandedId(null);
    });

    if (isExpanding) {
      setExpandedId(id);
    }
  };

  const exportRecipeAsJson = async (recipe: Recipe) => {
  if (!recipe) return;
  
      try {
        // const fileName = `${recipe.name.replace(/\s+/g, "_")}.json`;
        const fileName = `${recipe.name.replace(/\s+/g, "_")}.dfr`;
        const fileUri = FileSystem.cacheDirectory + fileName;
  
        // Prepare data with versioning
        const exportData = {
          version: 1,
          recipe,
        };
  
        await FileSystem.writeAsStringAsync(
          fileUri,
          JSON.stringify(exportData, null, 2)
        );
  
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Rezept teilen",
        });
      } catch (error) {
        console.error("Export Error:", error);
        Alert.alert("Fehler", "Rezept konnte nicht exportiert werden.");
      }
    };

    const [showSavedMessage, setShowSavedMessage] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          if (deleteModeId !== null) setDeleteModeId(null);
        }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Gespeicherte Rezepte</Text>

          {recipes.length === 0 && (
            <Text style={styles.text}>Noch keine Rezepte gespeichert.</Text>
          )}

          {recipes.map((r) => {
            // Initialize animations per recipe
            if (!rotationAnims.current[r.id]) {
              rotationAnims.current[r.id] = new Animated.Value(0);
            }
            if (!contentAnims.current[r.id]) {
              contentAnims.current[r.id] = new Animated.Value(0);
            }

            const rotate = rotationAnims.current[r.id].interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"],
            });

            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  if (deleteModeId) {
                    // cancel deletion mode
                    setDeleteModeId(null);
                  } else {
                    toggleExpand(r.id);
                  }
                }}
                onLongPress={() => setDeleteModeId(r.id)}
                onStartShouldSetResponder={() => true}
                style={[
                  styles.recipeBox,
                  expandedId === r.id && styles.recipeBoxExpanded,
                  deleteModeId === r.id && styles.recipeBoxDeleteMode,
                ]}
              >
                <View style={styles.recipeTitleRow}>
                  <Text style={styles.recipeTitle}>
                    {r.name} – {r.batchSize}L
                  </Text>
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={colors.onBackground}
                    />
                  </Animated.View>
                </View>

                {deleteModeId === r.id && (
                  <Pressable
                    onPress={() => {
                      deleteRecipe(r.id);
                      setDeleteModeId(null);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash" size={20} color={colors.onError} />
                  </Pressable>
                )}

                <Animated.View
                  style={{
                    height: expandedId === r.id ? undefined : 0,
                    opacity: contentAnims.current[r.id],
                    transform: [
                      {
                        translateY: contentAnims.current[r.id].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        }),
                      },
                    ],
                    overflow: "hidden",
                  }}
                >
                  <Text
                    style={[
                      styles.section,
                      { textDecorationLine: "underline" },
                    ]}
                  >
                    Zutaten:
                  </Text>

                  <Text style={styles.section}>Wasser</Text>
                  {r.hauptguss && (
                    <Text style={styles.ingredient}>
                      &bull; Hauptguss: {r.hauptguss} Liter
                    </Text>
                  )}
                  {r.nachguss && (
                    <Text style={styles.ingredient}>
                      &bull; Nachguss: {r.nachguss} Liter
                    </Text>
                  )}

                  <Text style={styles.section}>Malz</Text>
                  {r.malz.map((m, i) => (
                    <Text key={i} style={styles.ingredient}>
                      &bull; {m.name}: {m.amount} kg
                    </Text>
                  ))}

                  <Text style={styles.section}>Hopfen</Text>
                  {r.hopfen.map((h, i) => (
                    <Text key={i} style={styles.ingredient}>
                      &bull; {h.name}: {h.amount} g @ {h.alphaAcid}%α
                    </Text>
                  ))}

                  <Text style={styles.section}>Hefe</Text>
                  {r.hefe.map((h, i) => (
                    <Text key={i} style={styles.ingredient}>
                      &bull; {h.name}: {h.amount} g
                    </Text>
                  ))}

                  
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        gap: 12,
                        marginTop: 16,
                      }}
                    >
                      {/* Edit */}
                      <Tooltip title="Bearbeiten">
                        <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/modal/edit",
                          params: { id: r.id },
                        })
                      }
                      style={styles.iconButton}
                    >
                      <Ionicons
                        name="create-outline"
                        size={24}
                        color={colors.primary}
                      />
                    </Pressable>

                      {/* Duplicate */}
                      </Tooltip>
                      <Tooltip title="Duplizieren">
                        <Pressable
                      onPress={() => {
                        const newId = uuid.v4() as string;
                        const copy = {
                          ...r,
                          id: newId,
                          name: r.name + " (Kopie)",
                        };
                        addRecipe(copy);
                        setShowSavedMessage(true)
                      }}
                      style={styles.iconButton}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={24}
                        color={colors.primary}
                      />
                    </Pressable>

                      {/* Share */}
                      </Tooltip>
                      <Tooltip title="Rezept teilen">
                        <Pressable
                          onPress={() => exportRecipeAsJson(r)}
                          style={styles.iconButton}
                        >
                          <Ionicons
                            name="share-social-outline"
                            size={24}
                            color={colors.primary}
                          />
                        </Pressable>
                      </Tooltip>
                    </View>
                    
                  <View style={{ marginTop: 8 }}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/modal/schedule",
                          params: { id: r.id },
                        })
                      }
                      style={[
                        styles.brewButton,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Text style={styles.brewButtonText}>
                        Maisch- & Kochplan
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/modal/brew",
                          params: { id: r.id },
                        })
                      }
                      style={styles.brewButton}
                    >
                      <Text style={styles.brewButtonText}>Brauen</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </Pressable>
            );
          })}
        </ScrollView>
      </TouchableWithoutFeedback>
      <Snackbar
        visible={showSavedMessage}
        onDismiss={() => setShowSavedMessage(false)}
        duration={2000}
        style={{
          backgroundColor: colors.primary,
          position: "absolute",
          bottom: 2,
          left: 16,
          right: 16,
          borderRadius: 8,
        }}
      >
        Rezept dupliziert!
      </Snackbar>
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
      flexGrow: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.onBackground,
      marginBottom: 24,
    },
    recipeBox: {
      backgroundColor: colors.card,
      padding: 16,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      // Optional shadow for nicer look (iOS/Android)
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    recipeTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    recipeBoxExpanded: {
      backgroundColor: colors.card,
    },
    recipeTitle: {
      fontWeight: "bold",
      fontSize: 16,
      marginVertical: 3,
      color: colors.onBackground,
    },
    section: {
      marginTop: 10,
      marginBottom: 4,
      fontWeight: "600",
      color: colors.onSurface, // #444444
    },
    ingredient: {
      color: colors.onSurface, // #555555
      marginBottom: 2,
    },
    text: {
      color: colors.text,
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
      color: colors.onPrimary,
      fontWeight: "600",
      fontSize: 16,
      margin: 4,
    },
    recipeBoxDeleteMode: {
      backgroundColor: colors.errorContainer, // "#ff4d4d",
      borderColor: "#ff1a1a",
    },
    deleteButton: {
      marginTop: 12,
      backgroundColor: colors.error, // "#cc0000",
      padding: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    iconButton: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
