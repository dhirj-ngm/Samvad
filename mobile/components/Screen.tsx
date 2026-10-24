import type { PropsWithChildren, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';

export function Screen({ title, subtitle, children, back = false, action }: PropsWithChildren<{
  title: string; subtitle?: string; back?: boolean; action?: ReactNode;
}>) {
  const router = useRouter();
  const segments = useSegments();
  const home = title === 'Home';
  return <SafeAreaView style={styles.safe} edges={segments[0] === '(tabs)' ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}>
    <View style={styles.frame}>
      <View style={styles.header}>
        {back ? <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton}><Icon name="back" /></Pressable> : home ? <View style={styles.mark}><Icon name="chat" color={colors.surface} size={23} /></View> : null}
        <View style={styles.titles}><Text style={[styles.title, home && styles.wordmark]}>{home ? 'samvad' : title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
        {action ?? (home ? <Pressable accessibilityRole="button" accessibilityLabel="Find people" style={styles.iconButton} onPress={() => router.push('/people')}><Icon name="search" /></Pressable> : null)}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  frame: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surface },
  titles: { flex: 1 }, title: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -.6 },
  wordmark: { fontSize: 28, letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  mark: { width: 40, height: 40, backgroundColor: colors.accent, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  body: { flex: 1, backgroundColor: colors.surface },
});
