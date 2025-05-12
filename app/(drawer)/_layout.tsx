import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false, swipeEdgeWidth: 30 }}>
      <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: 'Home',
            title: 'DesiFriends',
          }}
        />
        <Drawer.Screen
          name="settings" 
          options={{
            drawerLabel: 'Einstellungen',
            title: 'Einstellungen',
          }}
        />
    </Drawer>
  );
}
