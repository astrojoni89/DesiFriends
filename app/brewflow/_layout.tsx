// app/brewflow/[id]/_layout.tsx
import { Stack } from "expo-router";

export default function BrewFlowLayout() {
  return <Stack screenOptions={{ animation: "slide_from_right", headerShown: false }} />;
}