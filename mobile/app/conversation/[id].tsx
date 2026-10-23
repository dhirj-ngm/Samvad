import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { FeedCard } from '../../components/FeedCard';
import { Screen } from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { FeedItem, NewsItem, PublicPost, PublicProfile } from '../../types/contracts';
import { colors, spacing, type } from '../../theme/tokens';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [message, setMessage] = useState('Loading context...');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let mounted = true;
    setItem(null); setMessage('Loading context...');
    void (async () => {
      if (!supabase) throw new Error();
      const { data: root, error } = await supabase.from('conversations')
        .select('id,news_item_id,root_post_id').eq('id', id).maybeSingle();
      if (error || !root) throw new Error();
      let loaded: FeedItem;
      if (root.news_item_id) {
        const { data, error: sourceError } = await supabase.from('news_items')
          .select('id,title,source_name,source_url,excerpt,language,published_at,topic')
          .eq('id', root.news_item_id).single();
        if (sourceError) throw sourceError;
        loaded = { kind: 'news', id: data.id, news: data as NewsItem, conversation_id: root.id };
      } else {
        const { data, error: postError } = await supabase.from('posts')
          .select('id,author_id,body,language,created_at,moderation_state,is_fixture')
          .eq('id', root.root_post_id).single();
        if (postError) throw postError;
        const { data: author, error: authorError } = await supabase.from('profiles')
          .select('user_id,handle,display_name,bio,preferred_language').eq('user_id', data.author_id).single();
        if (authorError) throw authorError;
        loaded = { kind: 'post', id: data.id, post: { ...data, author: author as PublicProfile, conversation_id: root.id } as PublicPost };
      }
      if (mounted) { setItem(loaded); setMessage(''); }
    })().catch(() => { if (mounted) setMessage('This context is unavailable or could not be loaded. Refresh to retry.'); });
    return () => { mounted = false; };
  }, [id, session?.user.id, attempt]));
  return <Screen title="Source and post context" subtitle="Original text and publisher attribution">
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.link}>Back</Text></Pressable>
      {item ? <FeedCard item={item} onOpen={() => setAttempt(n => n + 1)} /> : <Text style={styles.body}>{message}</Text>}
      {item?.kind === 'post' && item.post.moderation_state !== 'allowed' ? <Text style={styles.body}>Pending or held for trusted review. This post is visible only to its author.</Text> : null}
      <Text style={styles.body}>Replies, reports and translation are not available yet.</Text>
      <Pressable onPress={() => setAttempt(n => n + 1)} accessibilityRole="button"><Text style={styles.link}>Refresh context</Text></Pressable>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  link: { color: colors.accent, fontSize: type.body, fontWeight: '700', paddingVertical: spacing.md },
  body: { color: colors.muted, fontSize: type.body, lineHeight: 24, marginBottom: spacing.md },
});
