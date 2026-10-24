import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import {
  appendSocial,
  batchInteractions,
  batchMentions,
  conversationId,
  social,
  socialCursor,
} from "../lib/social";
import { supabase } from "../lib/supabase";
import type { InteractionState, Mention, SocialRow } from "../types/contracts";
import { colors } from "../theme/tokens";
import { EmptyState } from "./UI";
import { FeedCard } from "./FeedCard";
import { actionStyle, AuthorLink, linkStyle } from "./SocialUI";
export function SocialFeed({
  mode,
  id,
  header,
}: {
  mode: "following" | "posts" | "reposts";
  id?: string;
  header?: ReactElement;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<SocialRow[]>([]),
    [states, setStates] = useState<Record<string, InteractionState>>({}),
    [mentions, setMentions] = useState<Mention[]>([]);
  const [busy, setBusy] = useState(false),
    [more, setMore] = useState(false),
    [message, setMessage] = useState("");
  const generation = useRef(0),
    lock = useRef(false),
    latest = useRef(rows);
  latest.current = rows;
  const load = useCallback(
    async (reset: boolean) => {
      if (!reset && lock.current) return;
      const current = reset ? ++generation.current : generation.current;
      lock.current = true;
      setBusy(true);
      setMessage("");
      try {
        if (!supabase) throw new Error("Backend unavailable.");
        if (mode === "following" && !session)
          throw new Error(
            "Sign in, then follow people to build your Following feed.",
          );
        const after =
          reset || !latest.current.length
            ? null
            : socialCursor(latest.current.at(-1)!);
        const page = await social<SocialRow[]>(
          supabase,
          "feed",
          { mode, id, after },
          mode === "following" ? session?.user.id : undefined,
        );
        const [counts, tags] = await Promise.all([
          batchInteractions(
            supabase,
            page.map((r) => r.item),
          ).catch(() => ({}) as Record<string, InteractionState>),
          batchMentions(
            supabase,
            "post",
            page.filter((r) => r.item.kind === "post").map((r) => r.item.id),
          ).catch(() => []),
        ]);
        if (current === generation.current) {
          setRows((old) => (reset ? page : appendSocial(old, page)));
          setStates((old) => (reset ? counts : { ...old, ...counts }));
          setMentions((old) => (reset ? tags : [...old, ...tags]));
          setMore(page.length === 20);
        }
      } catch (e) {
        if (current === generation.current)
          setMessage(e instanceof Error ? e.message : "Feed unavailable.");
      } finally {
        if (current === generation.current) {
          lock.current = false;
          setBusy(false);
        }
      }
    },
    [mode, id, session?.user.id],
  );
  useFocusEffect(
    useCallback(() => {
      // Parents key this component by account/feed; retain data on a same-feed retry.
      void load(true);
      return () => {
        generation.current++;
        lock.current = false;
      };
    }, [load]),
  );
  return (
    <FlatList
      ListHeaderComponent={header}
      contentContainerStyle={{
        paddingHorizontal: 0,
        paddingBottom: 32,
        flexGrow: 1,
      }}
      data={rows}
      keyExtractor={(r) => r.id}
      refreshing={busy}
      onRefresh={() => void load(true)}
      renderItem={({ item: r }) => (
        <View>
          {r.reposter ? (
            <View>
              <Text style={{ color: colors.muted, fontSize: 12, marginHorizontal: 20, marginTop: 12 }}>Reposted by</Text>
              <View style={{ paddingHorizontal: 20 }}><AuthorLink profile={r.reposter} /></View>
            </View>
          ) : null}
          <FeedCard
            item={r.item}
            interaction={states[conversationId(r.item)]}
            mentions={mentions.filter((m) => m.entity_id === r.item.id)}
            onOpen={() =>
              router.push({
                pathname: "/conversation/[id]",
                params: { id: conversationId(r.item) },
              })
            }
          />
        </View>
      )}
      ListEmptyComponent={busy ? <ActivityIndicator color={colors.accent} style={{ margin: 32 }} /> : <EmptyState icon={mode === 'following' ? 'person' : 'chat'} title={mode === 'following' ? 'Make this feed yours' : 'A new voice starts here'} detail={mode === 'following' ? 'Follow people whose ideas you enjoy. Their posts will appear here.' : 'Public posts will appear here when they are ready.'} action={mode === 'following' ? 'Find people' : undefined} onAction={() => router.push('/people')} />}
      ListFooterComponent={
        <>
          {message ? (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.warning, paddingHorizontal: 20 }}>{message}</Text>
          ) : null}
          {message ? <Pressable accessibilityRole="button" style={actionStyle} disabled={busy} onPress={() => void load(true)}><Text style={linkStyle}>Try again</Text></Pressable> : null}
          {more ? (
            <Pressable
              accessibilityRole="button"
              style={actionStyle}
              disabled={busy}
              onPress={() => void load(false)}
            >
              <Text style={linkStyle}>Load more</Text>
            </Pressable>
          ) : null}
        </>
      }
    />
  );
}
