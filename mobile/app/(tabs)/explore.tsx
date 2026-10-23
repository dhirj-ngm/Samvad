import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SampleBanner } from '../../components/SampleBanner';
import { sampleInterests } from '../../data/sample';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Explore() {
  return <Screen title="Explore" subtitle="Find a topic to start reading">
    <FlatList data={sampleInterests} keyExtractor={item => item.id} contentContainerStyle={styles.list}
      ListHeaderComponent={<SampleBanner />}
      renderItem={({ item }) => <View style={styles.row}><Text style={styles.topic}>{item.label}</Text><Text style={styles.note}>Sample topic</Text></View>}
    />
  </Screen>;
}
const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topic: { color: colors.ink, fontSize: type.body, fontWeight: '600' },
  note: { color: colors.muted, fontSize: type.small },
});
