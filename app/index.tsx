// app/index.tsx
import 'react-native-reanimated';
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(drawer)/(tabs)/brewday/screen" />;
}


