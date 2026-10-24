import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/UI';
import { PostComposer } from '../../components/PostComposer';
import { useAuth } from '../../lib/auth';
import { colors, spacing } from '../../theme/tokens';

export default function Compose() {
  const router = useRouter();
  const { ready, session, profile, profileLoading, profileError, refreshProfile } = useAuth();
  return <Screen title="New post" subtitle="A thought can start a conversation.">
    {!ready || (session && !profile && profileLoading) || (session && profile && profile.user_id !== session.user.id) ? <Text style={styles.note}>Restoring account...</Text> : session && !profile && profileError ? <View style={styles.wrap}>
      <Text style={styles.note}>{profileError}</Text>
      <Pressable accessibilityRole="button" onPress={() => void refreshProfile().catch(() => {})}><Text style={styles.link}>Retry loading profile</Text></Pressable>
    </View> : !session || !profile ? <EmptyState icon="chat" title="Start with a thought" detail={!session ? 'Sign in to share it with your community.' : 'Finish your profile so people know who is joining the conversation.'} action={session ? 'Complete profile' : 'Sign in'} onAction={() => router.push(session ? '/onboarding' : '/sign-in')} /> : <PostComposer key={session.user.id} actor={session.user.id} handle={profile.handle} language={profile.preferred_language} />}
  </Screen>;
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg }, note: { color: colors.muted, padding: spacing.md, lineHeight: 24 },
  link: { color: colors.accent, fontWeight: '700', padding: spacing.md },
});
