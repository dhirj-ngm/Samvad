import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { PostComposer } from '../../components/PostComposer';
import { useAuth } from '../../lib/auth';
import { colors, spacing } from '../../theme/tokens';

export default function Compose() {
  const router = useRouter();
  const { ready, session, profile } = useAuth();
  return <Screen title="Compose" subtitle="Your words, under your public handle">
    {!ready || (session && profile && profile.user_id !== session.user.id) ? <Text style={styles.note}>Restoring account...</Text> : !session || !profile ? <View style={styles.wrap}>
      <Text style={styles.note}>{!session ? 'Sign in to save a post under your public handle.' : 'Finish your profile before writing a post.'}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push(session ? '/onboarding' : '/sign-in')}><Text style={styles.link}>{session ? 'Complete profile' : 'Sign in'}</Text></Pressable>
    </View> : <PostComposer key={session.user.id} actor={session.user.id} handle={profile.handle} language={profile.preferred_language} />}
  </Screen>;
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg }, note: { color: colors.muted, padding: spacing.md, lineHeight: 24 },
  link: { color: colors.accent, fontWeight: '700', padding: spacing.md },
});
