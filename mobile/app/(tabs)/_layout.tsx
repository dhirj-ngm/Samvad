import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { colors } from '../../theme/tokens';

const icon = (glyph: string, color: ColorValue) => <Text style={{ color, fontSize: 20, fontWeight: '700' }}>{glyph}</Text>;

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 62 }, tabBarLabelStyle: { fontSize: 11, paddingBottom: 4 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => icon('⌂', color) }} />
    <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => icon('⌕', color) }} />
    <Tabs.Screen name="compose" options={{ title: 'Compose', tabBarIcon: ({ color }) => icon('+', color) }} />
    <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color }) => icon('◌', color) }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => icon('○', color) }} />
  </Tabs>;
}
