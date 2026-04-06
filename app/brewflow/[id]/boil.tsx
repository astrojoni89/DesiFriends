import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { loadNotifee } from "@/utils/notifeeWrapper";
import * as Device from "expo-device";
import { useRecipes } from "@/context/RecipeContext";
import { useTheme, Portal, Dialog } from "react-native-paper";
import { usePermissionDialogs } from "@/hooks/usePermissionDialogs";
import { Ionicons } from "@expo/vector-icons";
import type { AppTheme } from "@/theme/theme";
import { useEffect, useRef, useState } from "react";
import { useTimerContext } from "@/context/TimerContext";
import { scheduleHopNotifications } from "@/hooks/useHopNotifications";

import { AnimatedCircularProgress } from "react-native-circular-progress";

export default function BoilTimer() {
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
  const parsedAlphaAcids = actualAlphaAcids ? JSON.parse(actualAlphaAcids) : {};

  const boilMinutes = parseInt(recipe?.boilTime || "0");
  const boilSeconds = boilMinutes * 60;
  const hopSchedule = recipe?.hopSchedule || [];

  const scaleFactor =
    recipe && recipe.batchSize && targetSize
      ? parseFloat(targetSize) / recipe.batchSize
      : 1;

  type Hop = {
    name: string;
    amount: string | number;
    time?: string | number;
    [key: string]: any;
  };

  const adjustedAmount = (hop: Hop) => {
    const hopIndex = recipe?.hopfen?.findIndex((h) => h.name === hop.name);
    const originalAA =
      typeof hopIndex === "number" && hopIndex >= 0
        ? parseFloat(recipe?.hopfen?.[hopIndex]?.alphaAcid || "0")
        : 0;
    const actualAA =
      typeof hopIndex === "number" && hopIndex >= 0
        ? parseFloat(parsedAlphaAcids[hopIndex] || originalAA.toString() || "0")
        : 0;

    let amount = parseFloat(hop.amount as string) * scaleFactor;
    if (originalAA > 0 && actualAA > 0) {
      amount *= originalAA / actualAA;
    }
    return amount;
  };

  const adjustedHopSchedule = hopSchedule.map((hop) => {
    if (!recipe || !recipe.hopfen) {
      return { ...hop, amount: (parseFloat(hop.amount) * scaleFactor).toFixed(1) };
    }
    const hopIndex = recipe.hopfen.findIndex((h) => h.name === hop.name);
    const originalAA = parseFloat(recipe.hopfen[hopIndex]?.alphaAcid || "0");
    const actualAA = parseFloat(
      parsedAlphaAcids[hopIndex] || originalAA.toString() || "0"
    );

    let adjustedAmount = parseFloat(hop.amount) * scaleFactor;
    if (originalAA > 0 && actualAA > 0) {
      adjustedAmount *= originalAA / actualAA;
    }

    return {
      ...hop,
      amount: adjustedAmount.toFixed(1),
    };
  });

  // Declared here so handleTogglePause can reference it without a forward-ref.
  const hopsAtStart = hopSchedule.filter(
    (hop) => parseInt(hop.time) * 60 >= boilSeconds
  );

  const { boil, stopAllTimers, setBrewPhase } = useTimerContext();
  const { onPermissionDenied, PermissionDialog } = usePermissionDialogs();
  const [vorderwuerzeDialog, setVorderwuerzeDialog] = useState<string | null>(null);

  useEffect(() => {
    setBrewPhase("boil");
  }, []);

  const paused = boil.isPaused();
  const timeLeft = boil.getTimeLeft();

  // In-boil hops: exclude Vorderwürzehopfen (already handled on start) and
  // flameout hops (time=0, shown on the complete screen).
  const inBoilHops = adjustedHopSchedule
    .filter((hop) => {
      const sec = parseInt(hop.time) * 60;
      return sec > 0 && sec < boilSeconds;
    })
    .sort((a, b) => parseInt(b.time) - parseInt(a.time));

  // Pre-mark hops that were already added before this mount (covers the
  // restore case — any hop whose threshold the timer has already passed).
  const initialPassed = new Set<string>();
  if (boil.timer && boil.timer.timeLeft > 0) {
    for (const hop of inBoilHops) {
      if (boil.timer.timeLeft < parseInt(hop.time) * 60) {
        initialPassed.add(`${hop.name}-${hop.time}`);
      }
    }
  }
  const shownHops = useRef<Set<string>>(initialPassed);

  const [pendingHop, setPendingHop] = useState<{
    name: string;
    amount: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    const maybeReschedule = async () => {
      if (
        Device.isDevice &&
        boil.timer &&
        !boil.timer.paused &&
        boil.timer.startTimestamp != null &&
        recipe?.hopSchedule
      ) {
        const now = Date.now();
        const elapsed = Math.floor((now - boil.timer.startTimestamp) / 1000);
        const delay = Math.max(1, boil.timer.duration - elapsed);

        await scheduleHopNotifications({
          hopSchedule: adjustedHopSchedule,
          boilSeconds: boil.timer.duration,
          timeLeft: delay,
          onPermissionDenied,
        });
      }
    };

    maybeReschedule();
  }, [boil.timer?.startTimestamp]);

  useEffect(() => {
    if (boil.timer && boil.timer.timeLeft <= 0) {
      router.replace({
        pathname: "/brewflow/[id]/complete",
        params: {
          id,
          targetSize,
          actualAlphaAcids: JSON.stringify(parsedAlphaAcids),
        },
      });
    }
  }, [boil.timer?.timeLeft]);

  // Pause and show the hop addition dialog when the timer reaches each hop's
  // scheduled time. Skip hops that were already added before this mount.
  useEffect(() => {
    if (!boil.timer || boil.timer.paused || timeLeft <= 0) return;

    for (const hop of inBoilHops) {
      const hopKey = `${hop.name}-${hop.time}`;
      if (timeLeft <= parseInt(hop.time) * 60 && !shownHops.current.has(hopKey)) {
        shownHops.current.add(hopKey);
        const pauseAndShow = async () => {
          boil.pauseTimer();
          setPendingHop(hop);
          const notifee = await loadNotifee();
          if (notifee) await notifee.default.cancelAllNotifications();
        };
        pauseAndShow();
        break; // show one at a time
      }
    }
  }, [timeLeft]);

  const handleHopAdded = () => {
    setPendingHop(null);
    boil.resumeTimer();
    // useEffect watching startTimestamp reschedules notifications automatically.
  };

  // Handle "Hinzugefügt" tapped directly on the notification while the app
  // is in the foreground or backgrounded (JS thread still alive).
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    loadNotifee().then((notifee) => {
      if (!notifee || !active) return;
      unsubscribe = notifee.default.onForegroundEvent(({ type, detail }: any) => {
        if (
          type === notifee.EventType?.ACTION_PRESS &&
          detail.pressAction?.id === "hop_added"
        ) {
          handleHopAdded();
        }
      });
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const getDisplayTime = () => {
    if (!boil.timer) {
      const m = Math.floor(boilSeconds / 60);
      const s = boilSeconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    return boil.getFormattedTime();
  };

  const startBoil = async () => {
    await stopAllTimers();
    boil.startTimer({
      id: `boil-${id}`,
      type: "boil",
      stepIndex: 0,
      duration: boilSeconds,
      targetSize: targetSize,
    });
    // Notification scheduling handled by the useEffect watching startTimestamp.
  };

  const handleTogglePause = async () => {
    const notifee = await loadNotifee();

    if (!boil.timer) {
      if (hopsAtStart.length > 0) {
        const alertHopText = hopsAtStart
          .map((hop) => `${adjustedAmount(hop).toFixed(1)} g ${hop.name}`)
          .join(", ");
        setVorderwuerzeDialog(alertHopText);
      } else {
        await startBoil();
      }

      return;
    }

    if (paused) {
      boil.resumeTimer();
      // Notification rescheduling handled by the useEffect watching startTimestamp.
    } else {
      if (notifee) {
        await notifee.default.cancelAllNotifications();
      }
      boil.pauseTimer();
    }
  };

  const handleReset = async () => {
    await stopAllTimers();
  };

  const total = boilSeconds;
  const timer = boil.timer;
  const circleFill = !timer && timeLeft === 0 ? 100 : (timeLeft / total) * 100;

  if (!recipe || boilMinutes <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keine Kochzeit gefunden</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kochen</Text>
      <Text style={styles.text}>Gesamtdauer: {boilMinutes} Minuten</Text>

      <AnimatedCircularProgress
        size={180}
        width={12}
        fill={circleFill}
        tintColor={colors.primary}
        backgroundColor={colors.surfaceVariant}
        rotation={0}
      >
        {() => (
          <View style={styles.timerContainer}>
            <Text style={styles.timer}>{getDisplayTime()}</Text>
          </View>
        )}
      </AnimatedCircularProgress>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable style={styles.iconButton} onPress={handleTogglePause}>
          <Ionicons
            name={paused ? "play" : "pause"}
            size={28}
            color={colors.onPrimary}
          />
        </Pressable>

        <Pressable
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>

      <Text style={[styles.text, { marginTop: 24 }]}>Hopfengaben:</Text>
      {hopSchedule.length > 0 ? (
        hopSchedule
          .sort((a, b) => parseInt(b.time) - parseInt(a.time))
          .map((hop, idx) => (
            <Text key={idx} style={styles.text}>
              {adjustedAmount(hop).toFixed(1)} g {hop.name} – {hop.time} min vor Ende
            </Text>
          ))
      ) : (
        <Text style={styles.text}>Keine Hopfengaben gefunden.</Text>
      )}

      {PermissionDialog}
      <Portal>
        <Dialog visible={pendingHop !== null} dismissable={false}>
          <Dialog.Title>Hopfengabe</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Jetzt hinzufügen:{"\n"}
              {pendingHop?.amount} g {pendingHop?.name}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable style={styles.dialogButton} onPress={handleHopAdded}>
              <Text style={styles.dialogButtonText}>Hinzugefügt</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={vorderwuerzeDialog !== null} dismissable={false}>
          <Dialog.Title>Vorderwürzehopfen</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>{vorderwuerzeDialog}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable
              style={styles.dialogButton}
              onPress={() => {
                setVorderwuerzeDialog(null);
                startBoil().catch((err: unknown) =>
                  console.error("Failed to start boil timer:", err)
                );
              }}
            >
              <Text style={styles.dialogButtonText}>Starte Kochtimer</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16,
      color: colors.onBackground,
    },
    text: {
      fontSize: 18,
      marginBottom: 8,
      color: colors.text,
    },
    timerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    timer: {
      fontSize: 48,
      fontWeight: "bold",
      marginBottom: 24,
      color: colors.primary,
      textAlign: "center",
      transform: [{ translateY: 9 }],
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 12,
    },
    buttonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
    iconButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },
    dialogText: {
      fontSize: 18,
      color: colors.text,
      lineHeight: 28,
    },
    dialogButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    dialogButtonText: {
      color: colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
  });
}
