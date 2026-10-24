import { AuthorLink, MentionLinks, SocialActions } from './SocialUI';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedItem, InteractionState, Mention } from '../types/contracts';
import { colors } from '../theme/tokens';
import { AIText, ContentSummary, NewsBrief } from './AIText';
import { Icon } from './Icon';
import { aiDemoEnabled } from '../lib/ai-client';

export function FeedCard({ item, onOpen, interaction, mentions = [] }: {
  item: FeedItem; onOpen: () => void; interaction?: InteractionState; mentions?: Mention[];
}) {
  const [linkError, setLinkError] = useState('');
  async function openSource() {
    if (item.kind !== 'news') return;
    try {
      if (!item.news.source_url.startsWith('https://')) throw new Error();
      await Linking.openURL(item.news.source_url); setLinkError('');
    } catch { setLinkError('Could not open the source. Please try again.'); }
  }
  return <View style={styles.card}>
    <View style={styles.header}>
      {item.kind === 'news' ? <>
        <View style={styles.sourceIcon}><Icon name="book" size={21} color={colors.accent} /></View>
        <View style={styles.identity}><Text style={styles.sourceName}>{item.news.source_name}</Text><Text style={styles.meta}>News · {new Date(item.news.published_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
        <View style={styles.topic}><Text style={styles.topicText}>{item.news.topic}</Text></View>
      </> : <>
        <View style={styles.identity}><AuthorLink profile={item.post.author} /></View>
        <Text style={styles.date}>{new Date(item.post.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
      </>}
    </View>
    {item.kind === 'news' ? <View style={styles.story}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Read discussion: ${item.news.title}`}><Text style={styles.title}>{item.news.title}</Text></Pressable>
      {item.news.excerpt ? <Text style={styles.description}>{item.news.excerpt}</Text> : null}
      <Pressable onPress={() => void openSource()} accessibilityRole="link" style={styles.sourceLink}><Text style={styles.link}>Read source</Text><Icon name="arrow" size={15} color={colors.accent} /></Pressable>
    </View> : <>
      {item.post.is_fixture ? <Text style={styles.sample}>Sample post</Text> : null}
      <AIText entityType="post" id={item.post.id} original={item.post.body} language={item.post.language} />
    </>}
    <MentionLinks mentions={mentions} />
    {item.kind === 'news' ? <NewsBrief id={item.news.id} /> : aiDemoEnabled && item.post.body.length > 250 ? <ContentSummary id={item.post.id} entityType="post" /> : null}
    <SocialActions key={item.kind === 'news' ? item.conversation_id : item.post.conversation_id}
      id={item.kind === 'news' ? item.conversation_id : item.post.conversation_id} state={interaction} onReply={onOpen} />
    {linkError ? <Text style={styles.meta} accessibilityLiveRegion="polite">{linkError}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  identity: { flex: 1, minWidth: 0 }, sourceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center' },
  sourceName: { color: colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  date: { color: colors.muted, fontSize: 12 },
  topic: { backgroundColor: colors.canvas, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 9, maxWidth: 106 },
  topicText: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  story: { backgroundColor: colors.canvas, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.ink, fontSize: 19, fontWeight: '700', lineHeight: 27, letterSpacing: -.3 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 8 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, marginTop: 4 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  sample: { color: colors.muted, fontSize: 11, marginBottom: 6 },
});
