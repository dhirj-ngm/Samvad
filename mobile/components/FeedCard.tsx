import { AuthorLink, MentionLinks, SocialActions } from "./SocialUI";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { FeedItem, InteractionState, Mention } from "../types/contracts";
import { colors, radius, spacing, type } from "../theme/tokens";
import { AIText, NewsBrief } from "./AIText";

export function FeedCard({
  item,
  onOpen,
  interaction,
  mentions = [],
}: {
  item: FeedItem;
  onOpen: () => void;
  interaction?: InteractionState;
  mentions?: Mention[];
}) {
  const news = item.kind === "news";
  const [linkError, setLinkError] = useState("");
  async function openSource() {
    if (item.kind !== "news") return;
    try {
      if (!item.news.source_url.startsWith("https://")) throw new Error();
      await Linking.openURL(item.news.source_url);
      setLinkError("");
    } catch {
      setLinkError("Could not open the publisher. Please try again.");
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>
        {news
          ? "CURATED SOURCE ARCHIVE"
          : item.post.is_fixture
            ? "DEMO FIXTURE · ORIGINAL POST"
            : "ORIGINAL POST"}
      </Text>
      {!news ? <AuthorLink profile={item.post.author} /> : null}
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${news ? "story" : "post"}`}
      >
        <Text style={styles.title}>
          {news ? item.news.title : `@${item.post.author.handle}`}
        </Text>
      </Pressable>
      {!news ? (
        <AIText
          entityType="post"
          id={item.post.id}
          original={item.post.body}
          language={item.post.language}
        />
      ) : null}
      <MentionLinks mentions={mentions} />
      <Text style={styles.meta}>
        {news
          ? `${item.news.source_name} · ${item.news.topic} · ${new Date(item.news.published_at).toLocaleDateString()}`
          : `@${item.post.author.handle} · ${item.post.language.toUpperCase()} · ${new Date(item.post.created_at).toLocaleDateString()}`}
      </Text>
      {news && item.news.excerpt ? (
        <Text style={styles.description}>{item.news.excerpt}</Text>
      ) : null}
      {news ? <NewsBrief id={item.news.id} /> : null}
      <View style={styles.footer}>
        {news ? (
          <Pressable onPress={() => void openSource()} accessibilityRole="link">
            <Text style={styles.link}>Read publisher ↗</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onOpen} accessibilityRole="button">
          <Text style={styles.link}>View context →</Text>
        </Pressable>
      </View>
      <SocialActions
        key={
          item.kind === "news"
            ? item.conversation_id
            : item.post.conversation_id
        }
        id={
          item.kind === "news"
            ? item.conversation_id
            : item.post.conversation_id
        }
        state={interaction}
        onReply={onOpen}
      />
      {linkError ? (
        <Text style={styles.meta} accessibilityLiveRegion="polite">
          {linkError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.accent,
    fontSize: type.small,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  title: {
    color: colors.ink,
    fontSize: type.heading,
    fontWeight: "600",
    lineHeight: 27,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.muted,
    fontSize: type.small,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  description: {
    color: colors.ink,
    fontSize: type.body,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  link: {
    color: colors.accent,
    fontSize: type.small,
    fontWeight: "700",
    paddingVertical: spacing.sm,
  },
});
