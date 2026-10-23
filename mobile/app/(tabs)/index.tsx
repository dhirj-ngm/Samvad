import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { FeedCard } from '../../components/FeedCard';
import { SampleBanner } from '../../components/SampleBanner';
import { Screen } from '../../components/Screen';
import { sampleFeed } from '../../data/sample';
import { spacing } from '../../theme/tokens';

export default function Home() {
  const router = useRouter();
  return <Screen title="Home" subtitle="Open conversations across India">
    <FlatList data={sampleFeed} keyExtractor={item => item.id} contentContainerStyle={styles.list}
      ListHeaderComponent={<SampleBanner />}
      renderItem={({ item }) => <FeedCard item={item} onOpen={() => router.push({ pathname: '/conversation/[id]', params: { id: item.kind === 'news' ? item.conversation_id : item.post.conversation_id } })} />}
    />
  </Screen>;
}
const styles = StyleSheet.create({ list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl } });
