import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { DiscoveryFeed } from '../../components/DiscoveryFeed';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { Interest } from '../../types/contracts';
import { colors, radius, spacing } from '../../theme/tokens';

export default function Explore() {
  const { session } = useAuth();
  const [topics, setTopics] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    if (supabase) void supabase.from('interests').select('id,slug,label').order('label').then(({ data, error }) => {
      if (mounted) { if (error) setMessage('Topics could not be loaded. Retry below.'); else { setTopics(data); setMessage(''); } }
    });
    return () => { mounted = false; };
  }, [attempt]);
  return <Screen title="Explore" subtitle="Topics from across India">
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topics}>
        {[{ id: 'all', slug: null, label: 'All topics' }, ...topics].map(topic => <Pressable key={topic.id}
          accessibilityRole="button" accessibilityState={{ selected: selected === topic.slug }}
          onPress={() => setSelected(topic.slug)} style={[styles.chip, selected === topic.slug && styles.selected]}>
          <Text style={styles.label}>{topic.label}</Text>
        </Pressable>)}
      </ScrollView>
      {message ? <Pressable onPress={() => setAttempt(n => n + 1)} accessibilityRole="button"><Text style={styles.error}>{message}</Text></Pressable> : null}
    </View>
    <DiscoveryFeed key={`${session?.user.id ?? 'public'}:${selected}`} topic={selected} />
  </Screen>;
}
const styles = StyleSheet.create({
  topics: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  chip: { padding: spacing.md, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, label: { color: colors.ink, fontWeight: '600' },
  error: { color: colors.warning, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
