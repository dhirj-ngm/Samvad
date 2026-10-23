import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SampleBanner } from '../../components/SampleBanner';
import { colors, radius, spacing, type } from '../../theme/tokens';

export default function Profile() {
  return <Screen title="Profile" subtitle="Public identity, private account details">
    <View style={styles.wrap}><SampleBanner /><View style={styles.card}>
      <Text style={styles.handle}>@sample_voice</Text><Text style={styles.body}>Sample public profile. Sign-in and real account settings are planned for P1.</Text>
      <Text style={styles.privacy}>Your public handle is visible. Your account email is not displayed. Platform operators may have access to account records under stated rules.</Text>
    </View></View>
  </Screen>;
}
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  handle: { color: colors.ink, fontSize: type.heading, fontWeight: '700' }, body: { color: colors.muted, fontSize: type.body, marginTop: spacing.sm, lineHeight: 24 },
  privacy: { color: colors.muted, fontSize: type.small, marginTop: spacing.lg, lineHeight: 20 },
});
