import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";
import CalcsScreen from "@/app/(drawer)/(tabs)/tools/index";

export default function ToolsModal() {
  const router = useRouter();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[styles.closeButton, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={22} color={colors.onSurface} />
      </Pressable>
      <CalcsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
});
