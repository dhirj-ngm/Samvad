import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { loadOwnPosts } from '../lib/discovery';
import type { OwnPost } from '../types/contracts';
import { colors, radius, spacing, type } from '../theme/tokens';

export function OwnPosts({ actor }: { actor: string }) {
  const [posts, setPosts] = useState<OwnPost[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const current = ++generation.current;
    setLoading(true);
    try {
      const rows = await loadOwnPosts(supabase, actor);
      if (current === generation.current) { setPosts(rows); setMessage(''); }
    } catch {
      if (current === generation.current) setMessage('Could not load your submissions. Tap refresh to retry.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [actor]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { generation.current++; }; }, [refresh]));
  async function remove(id: string) {
    if (!supabase || busy) return;
    setBusy(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== actor) throw new Error();
      const { data, error } = await supabase.rpc('delete_own_post', { p_post_id: id })
        .setHeader('Authorization', `Bearer ${session.access_token}`);
      if (error || !data) throw new Error();
      await refresh();
    } catch { setMessage('Removal was not confirmed. Refresh your submissions before retrying.'); }
    finally { setBusy(null); }
  }
  return <View style={styles.section}>
    <Text style={styles.heading}>My submissions</Text>
    <Text style={styles.note}>Your latest 20 posts. Pending posts are visible only to you until trusted review.</Text>
    <Pressable accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.link}>Refresh submissions</Text></Pressable>
    {message ? <Text accessibilityLiveRegion="polite" style={styles.note}>{message}</Text> : null}
    {loading ? <Text style={styles.note}>Loading your submissions…</Text> : !posts.length && !message ? <Text style={styles.note}>No saved posts yet.</Text> : null}
    {posts.map(post => <View key={post.id} style={styles.card}>
      <Text style={styles.status}>{post.moderation_state === 'allowed' ? 'Public' : post.moderation_state === 'pending' ? 'Pending review · only you' : 'Held for review · only you'}{post.is_fixture ? ' · Demo fixture' : ''}</Text>
      <Text style={styles.body}>{post.body}</Text>
      <Text style={styles.note}>{post.language.toUpperCase()} · {new Date(post.created_at).toLocaleDateString()}</Text>
      <Pressable accessibilityRole="button" disabled={busy !== null} onPress={() => Alert.alert('Remove this post?', 'Its text will be removed from the conversation.', [
        { text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void remove(post.id) },
      ])}><Text style={styles.link}>{busy === post.id ? 'Removing…' : 'Remove my post'}</Text></Pressable>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  section: { marginTop: spacing.lg }, heading: { fontSize: type.heading, color: colors.ink, fontWeight: '700' },
  note: { color: colors.muted, fontSize: type.small, lineHeight: 20, marginTop: spacing.sm },
  link: { color: colors.accent, fontWeight: '700', marginVertical: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  status: { color: colors.accent, fontWeight: '700', fontSize: type.small },
  body: { color: colors.ink, fontSize: type.body, lineHeight: 24, marginTop: spacing.sm },
});
