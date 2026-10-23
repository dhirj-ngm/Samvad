import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

export function SampleBanner() {
  return <View style={styles.banner} accessibilityRole="text">
    <Text style={styles.label}>SAMPLE UI · P0</Text>
    <Text style={styles.detail}>Fictional layout data. No account, news, or post is live.</Text>
  </View>;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.story, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  label: { color: colors.warning, fontSize: type.small, fontWeight: '800', letterSpacing: 1 },
  detail: { color: colors.ink, fontSize: type.small, marginTop: spacing.xs },
});
