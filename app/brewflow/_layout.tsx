import { Stack, useRouter, useNavigation } from "expo-router";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Portal, Dialog } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import { useTimerContext } from "@/context/TimerContext";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BrewFlowLayout() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const { stopAllTimers } = useTimerContext();

  const insets = useSafeAreaInsets();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const dialogStyles = StyleSheet.create({
    text: { fontSize: 16, color: colors.text, lineHeight: 24 },
    cancelButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    cancelText: { color: colors.text, fontSize: 15 },
    button: { backgroundColor: colors.error, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 8 },
    buttonText: { color: "#fff", fontWeight: "bold" as const, fontSize: 15 },
  });

  const handleExit = () => setConfirmVisible(true);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ animation: "slide_from_right", headerShown: false }} />
      <Pressable
        style={[styles.exitButton, { backgroundColor: colors.card, top: insets.top + 12 }]}
        onPress={handleExit}
      >
        <Ionicons name="stop-circle" size={24} color={colors.error} />
      </Pressable>
      <Pressable
        style={[styles.homeFab, { backgroundColor: colors.card, bottom: insets.bottom + 16 }]}
        onPress={() => (navigation as any).popToTop()}
      >
        <Ionicons name="home-outline" size={22} color={colors.onSurface} />
      </Pressable>
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        onPress={() => router.push("/modal/tools")}
      >
        <Ionicons name="calculator-outline" size={22} color={colors.onPrimary} />
      </Pressable>
      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Brautag beenden?</Dialog.Title>
          <Dialog.Content>
            <Text style={dialogStyles.text}>
              Evtl. laufende Timer werden gestoppt und du verlässt den Brautag.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Pressable style={dialogStyles.cancelButton} onPress={() => setConfirmVisible(false)}>
              <Text style={dialogStyles.cancelText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={dialogStyles.button}
              onPress={async () => {
                setConfirmVisible(false);
                await stopAllTimers();
                (navigation as any).popToTop();
              }}
            >
              <Text style={dialogStyles.buttonText}>Beenden</Text>
            </Pressable>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  exitButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  homeFab: {
    position: "absolute",
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
