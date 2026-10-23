import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SampleBanner } from '../../components/SampleBanner';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Compose() {
  return <Screen title="Compose" subtitle="Your words, under your public handle">
    <View style={styles.wrap}><SampleBanner />
      <View style={styles.card}>
        <Text style={styles.label}>Posting is unavailable in P0</Text>
        <Text style={styles.text}>Sign-in, a public handle, and durable publishing arrive after the shared contracts are agreed. No text entered here would be saved.</Text>
      </View>
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  label: { color: colors.ink, fontSize: type.heading, fontWeight: '700' }, text: { color: colors.muted, fontSize: type.body, lineHeight: 24, marginTop: spacing.sm },
});
