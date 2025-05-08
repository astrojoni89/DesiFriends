import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // or FontAwesome, MaterialIcons etc.
import { useColorScheme } from "react-native";

export const unstable_settings = {
  initialRouteName: 'brewday',
};

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarActiveTintColor: "#007AFF", tabBarHideOnKeyboard: false }}
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
        name="brewday/index"
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
  );
}
