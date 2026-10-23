import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SampleBanner } from '../../components/SampleBanner';
import { useAuth } from '../../lib/auth';
import { loadPendingDraft } from '../../lib/onboarding';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Profile() {
  const router = useRouter();
  const { ready, session, profile } = useAuth();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) { setPending(false); return; }
    loadPendingDraft(session.user.id).then(value => setPending(Boolean(value)))
      .catch(() => setPending(true));
  }, [session?.user.id, profile]);

  async function signOut() {
    if (!supabase) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
    setBusy(false);
  }

  return <Screen title="Profile" subtitle="Public identity, private account details">
    <ScrollView contentContainerStyle={styles.wrap}>
      {!ready ? <Text style={styles.body}>Restoring account…</Text> : session ? <View style={styles.card}>
        <Text style={styles.handle}>{profile ? `@${profile.handle}` : 'Set your public handle'}</Text>
        <Text style={styles.body}>{pending ? 'Your last profile save did not finish. Resume setup to confirm your interests.' : profile ? `Reading language: ${profile.preferred_language.toUpperCase()}` : 'Choose a handle and reading language to finish setup.'}</Text>
        <Text style={styles.privacy}>Your account email stays in private Auth settings and is not shown on your public profile. This app does not claim legal identity verification.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/onboarding')} accessibilityRole="button"><Text style={styles.buttonText}>{profile && !pending ? 'Edit profile and interests' : 'Resume setup'}</Text></Pressable>
        {message ? <Text style={styles.error} accessibilityLiveRegion="polite">{message}</Text> : null}
        <Pressable onPress={signOut} disabled={busy} accessibilityRole="button"><Text style={styles.link}>{busy ? 'Signing out…' : 'Sign out'}</Text></Pressable>
      </View> : <><SampleBanner /><View style={styles.card}>
        <Text style={styles.handle}>@sample_voice</Text>
        <Text style={styles.body}>This is a sample profile. Create an account to choose your own public handle.</Text>
        {!supabase ? <Text style={styles.privacy}>Live accounts are waiting for development Supabase configuration.</Text> : null}
        <Pressable style={styles.button} onPress={() => router.push('/sign-in')} accessibilityRole="button"><Text style={styles.buttonText}>Sign in</Text></Pressable>
        <Pressable onPress={() => router.push('/sign-up')} accessibilityRole="link"><Text style={styles.link}>Create account</Text></Pressable>
      </View></>}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  handle: { color: colors.ink, fontSize: type.heading, fontWeight: '700' }, body: { color: colors.muted, fontSize: type.body, marginTop: spacing.sm, lineHeight: 24 },
  privacy: { color: colors.muted, fontSize: type.small, marginTop: spacing.lg, lineHeight: 20 },
  button: { marginTop: spacing.lg, backgroundColor: colors.accent, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700' }, link: { color: colors.accent, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' },
  error: { color: colors.warning, marginTop: spacing.md },
});
