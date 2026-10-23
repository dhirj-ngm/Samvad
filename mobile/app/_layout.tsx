import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  return <SafeAreaProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="conversation/[id]" options={{ presentation: 'card' }} />
  </Stack></SafeAreaProvider>;
}
