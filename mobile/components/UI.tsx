import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

export function SegmentedTabs<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (value: T) => void;
}) {
  return <View style={styles.tabs}>{options.map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={({ pressed }) => [styles.tab, pressed && { opacity: .6 }]}>
    <Text style={[styles.tabText, value === option.value && styles.activeText]}>{option.label}</Text>
    {value === option.value ? <View style={styles.indicator} /> : null}
  </Pressable>)}</View>;
}
export function EmptyState({ icon = 'chat', title, detail, action, onAction }: {
  icon?: IconName; title: string; detail: string; action?: string; onAction?: () => void;
}) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Icon name={icon} size={30} color={colors.accent} /></View>
    <Text style={styles.emptyTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}><Text style={styles.buttonText}>{action}</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50, paddingHorizontal: 12, paddingVertical: 14 },
  tabText: { color: colors.muted, fontSize: 15, fontWeight: '600' }, activeText: { color: colors.ink, fontWeight: '800' },
  indicator: { height: 3, width: 36, backgroundColor: colors.accent, borderRadius: 3, position: 'absolute', bottom: 0 },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 48, gap: 12 },
  emptyIcon: { width: 68, height: 68, backgroundColor: colors.accentSoft, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  detail: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 300 },
  button: { minHeight: 46, justifyContent: 'center', backgroundColor: colors.accent, paddingHorizontal: 24, borderRadius: 24, marginTop: 10 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
});
