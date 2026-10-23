import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedItem } from '../types/contracts';
import { colors, radius, spacing, type } from '../theme/tokens';

export function FeedCard({ item, onOpen }: { item: FeedItem; onOpen: () => void }) {
  const news = item.kind === 'news';
  return <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open sample ${news ? 'story' : 'post'} conversation`} style={styles.card}>
    <Text style={styles.kicker}>{news ? 'SAMPLE NEWS LAYOUT' : 'SAMPLE ORIGINAL POST'}</Text>
    <Text style={styles.title}>{news ? item.news.title : item.post.body}</Text>
    <Text style={styles.meta}>{news ? `${item.news.source_name} · ${item.news.topic}` : `@${item.post.author.handle} · original: Malayalam`}</Text>
    <View style={styles.footer}><Text style={styles.link}>View conversation →</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  kicker: { color: colors.accent, fontSize: type.small, fontWeight: '800', letterSpacing: .6 },
  title: { color: colors.ink, fontSize: type.heading, fontWeight: '600', lineHeight: 27, marginTop: spacing.sm },
  meta: { color: colors.muted, fontSize: type.small, marginTop: spacing.sm },
  footer: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.sm },
  link: { color: colors.accent, fontSize: type.small, fontWeight: '700' },
});
