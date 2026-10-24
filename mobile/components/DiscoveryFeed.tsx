import {
  batchInteractions,
  batchMentions,
  conversationId,
} from "../lib/social";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { asFeedItem, loadFeed } from "../lib/discovery";
import { appendFeed, feedCursor } from "../lib/post-model";
import type {
  DiscoveryRow,
  InteractionState,
  Mention,
} from "../types/contracts";
import { EmptyState } from "./UI";
import { FeedCard } from "./FeedCard";
import { colors, spacing, type } from "../theme/tokens";

export function DiscoveryFeed({ topic = null }: { topic?: string | null }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, InteractionState>>({});
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [rows, setRows] = useState<DiscoveryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [more, setMore] = useState(true);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const latest = useRef(rows);
  latest.current = rows;
  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (!supabase) {
        setMessage(
          "Your feed is temporarily unavailable. Please try again later.",
        );
        return;
      }
      if (!reset && inFlight.current) return;
      const current = reset ? ++generation.current : generation.current;
      inFlight.current = true;
      setLoading(true);
      setMessage("");
      try {
        const after =
          !reset && latest.current.length
            ? feedCursor(latest.current.at(-1)!)
            : null;
        const page = await loadFeed(supabase, topic, after);
        const [counts, tags] = await Promise.all([
          batchInteractions(supabase, page.map(asFeedItem)).catch(
            () => ({}) as Record<string, InteractionState>,
          ),
          batchMentions(
            supabase,
            "post",
            page.filter((r) => r.kind === "post").map((r) => r.id),
          ).catch(() => []),
        ]);
        if (current !== generation.current) return;
        setStates((old) => (reset ? counts : { ...old, ...counts }));
        setMentions((old) => (reset ? tags : [...old, ...tags]));
        setRows((previous) => (reset ? page : appendFeed(previous, page)));
        setMore(page.length === 20);
      } catch {
        if (current === generation.current)
          setMessage(
            "Could not load the feed. Check your connection and retry.",
          );
      } finally {
        if (current === generation.current) {
          setLoading(false);
          inFlight.current = false;
        }
      }
    },
    [topic],
  );
  useFocusEffect(
    useCallback(() => {
      setMore(true);
      void fetchPage(true);
      return () => {
        generation.current++;
        inFlight.current = false;
      };
    }, [fetchPage]),
  );
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => `${row.kind}:${row.id}`}
      contentContainerStyle={styles.list}
      refreshing={loading}
      onRefresh={() => void fetchPage(true)}
      ListHeaderComponent={message ? <View style={styles.intro}><Text style={styles.error} accessibilityLiveRegion="polite">{message}</Text><Pressable onPress={() => void fetchPage(true)} accessibilityRole="button"><Text style={styles.link}>Try again</Text></Pressable></View> : undefined}
      ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 48 }} color={colors.accent} accessibilityLabel="Loading feed" /> : <EmptyState title="Start a conversation" detail={message ? 'Your feed will be back when your connection is restored.' : 'No posts here yet. Share a thought or explore another topic.'} action="Write a post" onAction={() => router.push('/(tabs)/compose')} />}
      renderItem={({ item }) => (
        <FeedCard
          interaction={states[conversationId(asFeedItem(item))]}
          mentions={mentions.filter((m) => m.entity_id === item.id)}
          item={asFeedItem(item)}
          onOpen={() =>
            router.push({
              pathname: "/conversation/[id]",
              params: { id: item.conversation_id },
            })
          }
        />
      )}
      ListFooterComponent={
        more && rows.length ? (
          <Pressable
            disabled={loading}
            accessibilityRole="button"
            onPress={() => void fetchPage(false)}
          >
            <Text style={styles.link}>
              {loading ? "Loading…" : "Load more"}
            </Text>
          </Pressable>
        ) : undefined
      }
    />
  );
}
const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 0,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  intro: { margin: spacing.md },
  note: { color: colors.muted, fontSize: type.small, lineHeight: 21 },
  link: {
    color: colors.accent,
    fontWeight: "700",
    paddingVertical: spacing.md,
  },
  error: { color: colors.warning, fontSize: type.body, marginTop: spacing.sm },
});
