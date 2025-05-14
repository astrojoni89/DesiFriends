// app/brewday/_layout.tsx
import { Slot } from "expo-router";
import { Keyboard, TouchableWithoutFeedback, View } from "react-native";
import { useDeleteMode } from "@/context/DeleteModeContext";

export default function BrewdayLayout() {
  const { setDeleteModeId } = useDeleteMode();

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        setDeleteModeId(null);
      }}
    >
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </TouchableWithoutFeedback>
  );
}
