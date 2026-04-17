import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import type { AppTheme } from "@/theme/theme";
import { useTimerContext } from "@/context/TimerContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STEP = 0.5; // litres per tap

export default function LauterScreen() {
  const { id, targetSize, actualAlphaAcids } = useLocalSearchParams<{
    id: string;
    targetSize?: string;
    actualAlphaAcids?: string;
  }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(id || "");
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(colors);
  const router = useRouter();
  const { mash, brewSession, startBrewSession, setBrewPhase } = useTimerContext();

  // Clear any lingering mash timer (expired or skipped) so the floating widget
  // shows "Läutern" instead of "Maischen 0:00". Also ensures the brew session
  // is active (handles skipped mash) and phase is set correctly even if the
  // user navigated back from the boil screen.
  useEffect(() => {
    // Only clear the mash timer if it has truly finished — never reset an
    // active or paused timer (e.g. user accidentally navigated here).
    if (mash.timer && mash.getTimeLeft() <= 0) mash.resetTimer();
    if (!brewSession) startBrewSession(id!, targetSize);
    else setBrewPhase("lauter");
  }, []);

  const scaleFactor =
    recipe && recipe.batchSize && targetSize
      ? parseFloat(targetSize) / recipe.batchSize
      : 1;

  const totalNachguss = (recipe?.nachguss ?? 0) * scaleFactor;

  const STORAGE_KEY = `lauter-added-${id}`;
  const [added, setAdded] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) setAdded(parseFloat(val));
    });
  }, []);

  const updateAdded = (next: number) => {
    setAdded(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next));
  };

  const increment = () =>
    updateAdded(Math.round((added + STEP) * 10) / 10);
  const decrement = () =>
    updateAdded(Math.max(0, Math.round((added - STEP) * 10) / 10));

  const progress = totalNachguss > 0 ? Math.min(added / totalNachguss, 1) : 0;
  const isDone = added >= totalNachguss && totalNachguss > 0;

  const goToBoil = () => {
    AsyncStorage.removeItem(STORAGE_KEY);
    router.replace({
      pathname: "/brewflow/[id]/boil",
      params: { id, targetSize, actualAlphaAcids },
    });
  };

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Rezept nicht gefunden</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Läutern</Text>

      {/* Funny rest message */}
      <View style={styles.messageCard}>
        <Text style={styles.messageHeadline}>Läuterruhe!</Text>
        <Text style={styles.messageBody}>
          Trink ein Bier und halt kurz inne!
        </Text>
      </View>

      {/* Nachguss counter card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nachguss</Text>
        <Text style={styles.cardSubtitle}>
          Gesamt: {totalNachguss.toFixed(1)} L
        </Text>

        <View style={styles.counterRow}>
          <Pressable
            style={[
              styles.counterButton,
              added === 0 && { opacity: 0.35 },
            ]}
            onPress={decrement}
            disabled={added === 0}
          >
            <Ionicons name="remove" size={26} color={colors.onPrimary} />
          </Pressable>

          <Text style={styles.counterValue}>{added.toFixed(1)} L</Text>

          <Pressable style={styles.counterButton} onPress={increment}>
            <Ionicons name="add" size={26} color={colors.onPrimary} />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.progressLabel}>
          {isDone
            ? `Nachguss abgeschlossen (${added.toFixed(1)} L)`
            : `${added.toFixed(1)} von ${totalNachguss.toFixed(1)} L hinzugefügt`}
        </Text>
      </View>

      <Pressable
        style={[styles.button, isDone && { backgroundColor: colors.primary }]}
        onPress={goToBoil}
      >
        <Text style={styles.buttonText}>Zum Kochen</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.onBackground,
    },
    messageCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    messageHeadline: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 6,
    },
    messageBody: {
      fontSize: 16,
      color: colors.text,
      textAlign: "center",
    },
    card: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      alignItems: "center",
      marginBottom: 28,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 15,
      color: colors.text,
      marginBottom: 20,
      opacity: 0.7,
    },
    counterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 24,
      marginBottom: 20,
    },
    counterButton: {
      backgroundColor: colors.primary,
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    counterValue: {
      fontSize: 32,
      fontWeight: "bold",
      color: colors.onBackground,
      minWidth: 90,
      textAlign: "center",
    },
    progressTrack: {
      width: "100%",
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfaceVariant,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    progressLabel: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.8,
    },
    button: {
      width: "100%",
      backgroundColor: colors.secondary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
  });
}
