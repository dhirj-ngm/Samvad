import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, type } from "../theme/tokens";

export function Screen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>samvad / संवाद</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  brand: {
    color: colors.accent,
    fontSize: type.small,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.ink, fontSize: type.title, fontWeight: "700" },
  subtitle: {
    color: colors.muted,
    fontSize: type.small,
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  body: { flex: 1 },
});
