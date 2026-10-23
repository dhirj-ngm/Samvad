import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors, spacing, type } from '../../theme/tokens';

export default function Activity() {
  return <Screen title="Activity" subtitle="Replies and mentions will live here">
    <View style={styles.center}><Text style={styles.title}>No activity yet</Text><Text style={styles.body}>Notifications are not connected in this P0 sample.</Text></View>
  </Screen>;
}
const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }, title: { color: colors.ink, fontSize: type.heading, fontWeight: '700' }, body: { color: colors.muted, fontSize: type.body, textAlign: 'center', marginTop: spacing.sm } });
