import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // or FontAwesome, MaterialIcons etc.
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export const unstable_settings = {
  initialRouteName: 'brewday',
};

export default function TabLayout() {
  // const colorScheme = useColorScheme();
  const theme = useTheme() as AppTheme;
  const { colors } = theme;

  return (
    // <TouchableWithoutFeedback
    //   onPress={() => {
    //     Keyboard.dismiss();
    //     setDeleteModeId(null);
    //   }}
    // >
    //   <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarHideOnKeyboard: true }}
    >
      <Tabs.Screen
        name="recipes/index"
        options={{
          title: "Rezepte",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="beer" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="brewday"
        options={{
          title: "Brautag",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="flask" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools/index"
        options={{
          title: "Calcs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    /* </View>
    </TouchableWithoutFeedback> */
  );
}
