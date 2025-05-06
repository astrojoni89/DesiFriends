// import { Stack } from 'expo-router';
// import { useColorScheme } from 'react-native';
// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { StatusBar } from 'expo-status-bar';

// export default function RootLayout() {
//   const colorScheme = useColorScheme();

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack>
//         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }

import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RecipeProvider } from '../context/RecipeContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <RecipeProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal/brew" options={{ presentation: 'modal', title: 'Brautag' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </RecipeProvider>
  );
}
