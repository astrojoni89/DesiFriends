import { useState, useRef } from "react";
import { useRecipes } from "@/context/RecipeContext";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Button,
  Animated,
  Easing,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BrewDayScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = createStyles(isDark);
  const { recipes, deleteRecipe } = useRecipes();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteModeId, setDeleteModeId] = useState<string | null>(null);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          if (deleteModeId !== null) setDeleteModeId(null);
        }}
      >
        <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
              // <Pressable
              //   key={r.id}
              //   onPress={() => toggleExpand(r.id)}
              //   style={[
              //     styles.recipeBox,
              //     expandedId === r.id && styles.recipeBoxExpanded,
              //   ]}
              // >
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
                    <Ionicons name="chevron-down" size={20} color="#666" />
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
                    <Ionicons name="trash" size={20} color="#fff" />
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
                  <Text style={styles.section}>Malz</Text>
                  {r.malz.map((m, i) => (
                    <Text key={i} style={styles.ingredient}>
                      - {m.name}: {m.amount} kg
                    </Text>
                  ))}

                  <Text style={styles.section}>Hopfen</Text>
                  {r.hopfen.map((h, i) => (
                    <Text key={i} style={styles.ingredient}>
                      - {h.name}: {h.amount} g @ {h.alphaAcid}%α
                    </Text>
                  ))}

                  <Text style={styles.section}>Hefe</Text>
                  {r.hefe.map((h, i) => (
                    <Text key={i} style={styles.ingredient}>
                      - {h.name}: {h.amount} g
                    </Text>
                  ))}

                  <View style={{ marginTop: 16 }}>
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
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      paddingTop: 32,
      flex: 1,
      backgroundColor: isDark ? "#000" : "#fff",
    },
    content: {
      padding: 16,
      flexGrow: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: isDark ? "#fff" : "#000",
      marginBottom: 24,
    },
    recipeBox: {
      backgroundColor: "#f9f9f9",
      padding: 16,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#ddd",
      // Optional shadow for nicer look (iOS/Android)
      shadowColor: "#000",
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
      backgroundColor: "#ececec",
    },
    recipeTitle: {
      fontWeight: "bold",
      fontSize: 16,
      marginVertical: 3,
      color: "#222",
    },
    section: {
      marginTop: 10,
      marginBottom: 4,
      fontWeight: "600",
      color: "#444",
    },
    ingredient: {
      color: "#555",
      marginBottom: 2,
    },
    text: {
      color: "#888",
    },
    brewButton: {
      backgroundColor: "#007AFF",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    brewButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
      margin: 4,
    },
    recipeBoxDeleteMode: {
      backgroundColor: "#ff4d4d",
      borderColor: "#ff1a1a",
    },

    deleteButton: {
      marginTop: 12,
      backgroundColor: "#cc0000",
      padding: 10,
      borderRadius: 8,
      alignItems: "center",
    },
  });
}
