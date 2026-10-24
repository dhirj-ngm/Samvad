import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

export function SampleBanner() {
  return <View style={styles.banner} accessibilityRole="text">
    <Text style={styles.label}>Preview</Text>
    <Text style={styles.detail}>Sample content for exploring the layout.</Text>
  </View>;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.canvas, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  label: { color: colors.warning, fontSize: type.small, fontWeight: '500' },
  detail: { color: colors.ink, fontSize: type.small, marginTop: spacing.xs },
});
