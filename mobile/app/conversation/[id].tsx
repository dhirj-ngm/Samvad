import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SampleBanner } from '../../components/SampleBanner';
import { Screen } from '../../components/Screen';
import { sampleFeed } from '../../data/sample';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = sampleFeed.find(entry => entry.kind === 'news' ? entry.conversation_id === id : entry.post.conversation_id === id);
  return <Screen title="Conversation" subtitle="Sample navigation detail">
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={styles.back}>← Back</Text></Pressable>
      <SampleBanner />
      <View style={styles.card}><Text style={styles.kicker}>{item?.kind === 'news' ? 'SAMPLE STORY' : 'SAMPLE POST'}</Text>
        <Text style={styles.title}>{item?.kind === 'news' ? item.news.title : item?.kind === 'post' ? item.post.body : 'Sample conversation unavailable'}</Text>
        <Text style={styles.body}>Replies, translation, reporting, and publishing are not connected in P0.</Text>
      </View>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }, back: { color: colors.accent, fontSize: type.body, fontWeight: '700', marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  kicker: { color: colors.accent, fontSize: type.small, fontWeight: '800' }, title: { color: colors.ink, fontSize: type.heading, fontWeight: '700', marginTop: spacing.sm, lineHeight: 28 },
  body: { color: colors.muted, fontSize: type.body, lineHeight: 24, marginTop: spacing.lg },
});
