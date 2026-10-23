import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { asFeedItem, loadFeed } from '../lib/discovery';
import { appendFeed, feedCursor } from '../lib/post-model';
import type { DiscoveryRow } from '../types/contracts';
import { FeedCard } from './FeedCard';
import { colors, spacing, type } from '../theme/tokens';

export function DiscoveryFeed({ topic = null }: { topic?: string | null }) {
  const router = useRouter();
  const [rows, setRows] = useState<DiscoveryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [more, setMore] = useState(true);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const latest = useRef(rows); latest.current = rows;
  const fetchPage = useCallback(async (reset: boolean) => {
    if (!supabase) { setMessage('The shared backend is not configured. Please try again after setup.'); return; }
    if (!reset && inFlight.current) return;
    const current = reset ? ++generation.current : generation.current;
    inFlight.current = true; setLoading(true); setMessage('');
    try {
      const after = !reset && latest.current.length ? feedCursor(latest.current.at(-1)!) : null;
      const page = await loadFeed(supabase, topic, after);
      if (current !== generation.current) return;
      setRows(previous => reset ? page : appendFeed(previous, page)); setMore(page.length === 20);
    } catch {
      if (current === generation.current) setMessage('Could not load the feed. Check your connection and retry.');
    } finally {
      if (current === generation.current) { setLoading(false); inFlight.current = false; }
    }
  }, [topic]);
  useFocusEffect(useCallback(() => {
    setRows([]); setMore(true); void fetchPage(true);
    return () => { generation.current++; inFlight.current = false; };
  }, [fetchPage]));
  return <FlatList data={rows} keyExtractor={row => `${row.kind}:${row.id}`}
    contentContainerStyle={styles.list} refreshing={loading}
    onRefresh={() => void fetchPage(true)}
    ListHeaderComponent={<View style={styles.intro}><Text style={styles.note}>Historical source archive and public original posts. New posts await review in Profile → My submissions.</Text>
      {message ? <Text style={styles.error} accessibilityLiveRegion="polite">{message}</Text> : null}
      <Pressable onPress={() => void fetchPage(true)} accessibilityRole="button"><Text style={styles.link}>Refresh feed</Text></Pressable>
    </View>}
    ListEmptyComponent={loading ? <ActivityIndicator color={colors.accent} accessibilityLabel="Loading feed" /> : <Text style={styles.note}>{message ? 'Your feed will appear after a successful retry.' : 'No public posts or source items match yet. Try another topic.'}</Text>}
    renderItem={({ item }) => <FeedCard item={asFeedItem(item)} onOpen={() => router.push({ pathname: '/conversation/[id]', params: { id: item.conversation_id } })} />}
    ListFooterComponent={more && rows.length ? <Pressable disabled={loading} accessibilityRole="button" onPress={() => void fetchPage(false)}><Text style={styles.link}>{loading ? 'Loading…' : 'Load more'}</Text></Pressable> : undefined}
  />;
}
const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  intro: { marginBottom: spacing.md }, note: { color: colors.muted, fontSize: type.small, lineHeight: 21 },
  link: { color: colors.accent, fontWeight: '700', paddingVertical: spacing.md },
  error: { color: colors.warning, fontSize: type.body, marginTop: spacing.sm },
});
