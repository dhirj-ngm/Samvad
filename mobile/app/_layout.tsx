import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  return <SafeAreaProvider><StatusBar barStyle="dark-content"/><AuthProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="conversation/[id]" options={{ presentation: 'card' }} />
    <Stack.Screen name="sign-in" />
    <Stack.Screen name="sign-up" />
    <Stack.Screen name="onboarding" />
  </Stack></AuthProvider></SafeAreaProvider>;
}
