import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from './Screen';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { loadPendingDraft } from '../lib/onboarding';
import { colors, radius, spacing, type } from '../theme/tokens';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const signingUp = mode === 'sign-up';
  const inFlight = useRef(false);

  async function submit() {
    if (inFlight.current) return;
    if (!supabase) { setMessage('Supabase is not configured for this build.'); return; }
    if (!email.trim() || password.length < 6) { setMessage('Enter an email and a password of at least 6 characters.'); return; }
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      if (signingUp) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your email to confirm your account. Return here and sign in after confirmation.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      const profile = await refreshProfile();
      const { data: { user } } = await supabase.auth.getUser();
      const pending = user ? await loadPendingDraft(user.id) : null;
      router.replace(profile && !pending ? '/(tabs)/profile' : '/onboarding');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect. Please retry.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <Screen title={signingUp ? 'Join Samvad' : 'Welcome back'} back subtitle="Your email stays private. Others see your public handle.">
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        {!supabase ? <Text style={styles.notice}>Sign-in is temporarily unavailable. You can still browse public conversations.</Text> : null}
        <View style={{backgroundColor:colors.accentSoft,borderRadius:20,padding:22,marginBottom:12}}><Text style={{fontSize:24,fontWeight:'800',color:colors.ink,lineHeight:32}}>A place for your perspective.</Text><Text style={{fontSize:14,lineHeight:22,color:colors.muted,marginTop:8}}>Ideas, conversations, and people — in a language that feels like home.</Text></View>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} accessibilityLabel="Email" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry autoComplete={signingUp ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} accessibilityLabel="Password" />
        {message ? <Text style={styles.notice} accessibilityLiveRegion="polite">{message}</Text> : null}
        <Pressable style={[styles.button, (!supabase || busy) && styles.disabled]} disabled={!supabase || busy} onPress={submit} accessibilityRole="button">
          <Text style={styles.buttonText}>{busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}</Text>
        </Pressable>
        <Pressable onPress={() => router.replace(signingUp ? '/sign-in' : '/sign-up')} accessibilityRole="link">
          <Text style={styles.link}>{signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')} accessibilityRole="link"><Text style={styles.link}>Explore conversations</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, content: { padding: spacing.lg, gap: spacing.sm, paddingTop: 32 },
  label: { color: colors.ink, fontWeight: '700', marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: spacing.md, color: colors.ink, fontSize: type.body },
  notice: { color: colors.warning, lineHeight: 21, marginVertical: spacing.sm },
  button: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: 14, alignItems: 'center', marginTop: spacing.md },
  disabled: { opacity: 0.45 }, buttonText: { color: colors.surface, fontWeight: '700', fontSize: type.body },
  link: { color: colors.accent, fontWeight: '600', textAlign: 'center', marginTop: spacing.md, minHeight: 44, paddingVertical: spacing.md },
});
