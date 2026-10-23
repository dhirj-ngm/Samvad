import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useAuth } from '../lib/auth';
import { clearPendingDraft, loadPendingDraft, savePendingDraft } from '../lib/onboarding';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, type } from '../theme/tokens';
import type { Interest, LanguageCode } from '../types/contracts';

const languages: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' }, { code: 'ml', label: 'മലയാളം' },
];

export default function Onboarding() {
  const router = useRouter();
  const { ready, session, refreshProfile } = useAuth();
  const [handle, setHandle] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (ready && !session) router.replace('/sign-in');
  }, [ready, session, router]);

  useEffect(() => {
    if (!supabase || !session) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [{ data: topics, error: topicsError }, { data: choices, error: choicesError }, { data: savedProfile, error: savedProfileError }, pending] = await Promise.all([
          supabase.from('interests').select('id,slug,label').order('label'),
          supabase.from('user_interests').select('interest_id').eq('user_id', session.user.id),
          supabase.from('profiles').select('user_id,handle,display_name,bio,preferred_language').eq('user_id', session.user.id).maybeSingle(),
          loadPendingDraft(session.user.id),
        ]);
        if (topicsError) throw topicsError;
        if (choicesError) throw choicesError;
        if (savedProfileError) throw savedProfileError;
        if (!mounted) return;
        setInterests((topics ?? []) as Interest[]);
        setHandle(pending?.handle ?? savedProfile?.handle ?? '');
        setLanguage(pending?.language ?? (savedProfile?.preferred_language as LanguageCode | undefined) ?? 'en');
        setSelected(pending?.interestIds ?? (choices ?? []).map(row => row.interest_id));
      } catch (error) { if (mounted) setMessage(error instanceof Error ? error.message : 'Could not load interests.'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [session?.user.id]);

  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }

  async function save() {
    if (!supabase || !session || saving) return;
    const normalized = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalized)) { setMessage('Handle: 3–30 lowercase letters, numbers, or underscores.'); return; }
    if (['admin', 'administrator', 'samvad', 'support', 'moderator', 'system'].includes(normalized)) { setMessage('Choose another handle.'); return; }
    setSaving(true); setMessage('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== session.user.id) throw new Error('Sign in again before saving.');
      const draft = { handle: normalized, language, interestIds: selected };
      await savePendingDraft(user.id, draft);
      const { data: currentProfile, error: currentProfileError } = await supabase.from('profiles')
        .select('display_name,bio').eq('user_id', user.id).maybeSingle();
      if (currentProfileError) throw currentProfileError;
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: user.id, handle: normalized, display_name: currentProfile?.display_name ?? '',
        bio: currentProfile?.bio ?? '', preferred_language: language,
      }, { onConflict: 'user_id' });
      if (profileError) throw profileError;

      const { data: existing, error: existingError } = await supabase.from('user_interests')
        .select('interest_id').eq('user_id', user.id);
      if (existingError) throw existingError;
      const oldIds = new Set((existing ?? []).map(row => row.interest_id));
      const wanted = new Set(selected);
      const added = [...wanted].filter(id => !oldIds.has(id));
      const removed = [...oldIds].filter(id => !wanted.has(id));
      if (added.length) {
        const { error } = await supabase.from('user_interests').upsert(
          added.map(interestId => ({ user_id: user.id, interest_id: interestId })),
          { onConflict: 'user_id,interest_id', ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      if (removed.length) {
        const { error } = await supabase.from('user_interests').delete().eq('user_id', user.id).in('interest_id', removed);
        if (error) throw error;
      }
      const { data: verified, error: verifyError } = await supabase.from('user_interests')
        .select('interest_id').eq('user_id', user.id);
      if (verifyError) throw verifyError;
      const verifiedIds = new Set((verified ?? []).map(row => row.interest_id));
      if (verifiedIds.size !== wanted.size || [...wanted].some(id => !verifiedIds.has(id))) throw new Error('Selections did not finish saving. Please retry.');
      await refreshProfile();
      await clearPendingDraft(user.id);
      router.replace('/(tabs)/profile');
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      setMessage(code === '23505' ? 'That handle is taken. Choose another.' : error instanceof Error ? error.message : 'Could not save. Please retry.');
    } finally { setSaving(false); }
  }

  if (!ready || loading) return <Screen title="Set up your profile"><Text style={styles.info}>Loading your account…</Text></Screen>;
  return <Screen title="Set up your profile" subtitle="Your handle is public. Choose a reading language and topics.">
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.label}>Public handle</Text>
        <TextInput style={styles.input} value={handle} onChangeText={setHandle} autoCapitalize="none" autoCorrect={false} maxLength={30} placeholder="your_handle" accessibilityLabel="Public handle" />
        <Text style={styles.label}>Reading language</Text>
        <View style={styles.row}>{languages.map(item => <Pressable key={item.code} onPress={() => setLanguage(item.code)} style={[styles.choice, language === item.code && styles.active]} accessibilityRole="radio" accessibilityState={{ selected: language === item.code }}><Text style={styles.choiceText}>{item.label}</Text></Pressable>)}</View>
        <Text style={styles.label}>Interests (optional)</Text>
        <Text style={styles.hint}>Pick a few now, or leave them empty and edit later.</Text>
        <View style={styles.row}>{interests.map(item => <Pressable key={item.id} onPress={() => toggle(item.id)} style={[styles.choice, selected.includes(item.id) && styles.active]} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(item.id) }}><Text style={styles.choiceText}>{item.label}</Text></Pressable>)}</View>
        {message ? <Text style={styles.error} accessibilityLiveRegion="polite">{message}</Text> : null}
        <Pressable onPress={save} disabled={saving || !session || interests.length === 0} style={[styles.button, (saving || !session || interests.length === 0) && styles.disabled]} accessibilityRole="button"><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save profile'}</Text></Pressable>
        <Pressable onPress={() => router.replace('/(tabs)/profile')} accessibilityRole="link"><Text style={styles.link}>Back to Profile</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xl },
  label: { color: colors.ink, fontWeight: '700', fontSize: type.body, marginTop: spacing.md, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, fontSize: type.body, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { padding: spacing.sm, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, backgroundColor: colors.surface },
  active: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, choiceText: { color: colors.ink },
  hint: { color: colors.muted }, error: { color: colors.warning, marginTop: spacing.md, lineHeight: 21 }, info: { color: colors.muted, padding: spacing.lg },
  button: { backgroundColor: colors.accent, alignItems: 'center', padding: spacing.md, borderRadius: radius.sm, marginTop: spacing.lg },
  disabled: { opacity: 0.45 }, buttonText: { color: colors.surface, fontSize: type.body, fontWeight: '700' },
  link: { color: colors.accent, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
});
