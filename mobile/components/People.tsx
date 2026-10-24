import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../theme/tokens";
import { Icon } from "./Icon";
import { EmptyState } from "./UI";
import { useAuth } from "../lib/auth";
import { searchPeople, social } from "../lib/social";
import { supabase } from "../lib/supabase";
import type { PublicProfile } from "../types/contracts";
import { actionStyle, AuthorLink, linkStyle } from "./SocialUI";
export function People({
  id,
  direction,
}: {
  id?: string;
  direction?: "followers" | "following";
}) {
  const { session } = useAuth();
  const [query, setQuery] = useState(""),
    [rows, setRows] = useState<PublicProfile[]>([]),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [more, setMore] = useState(false),
    [attempt, setAttempt] = useState(0);
  const run = useRef(0),
    lock = useRef(false);
  async function load(reset: boolean) {
    if (lock.current && !reset) return;
    const current = ++run.current;
    lock.current = true;
    setBusy(true);
    setMessage("");
    if (reset) setMore(false);
    try {
      if (!supabase) throw new Error("Backend unavailable.");
      const after = reset ? undefined : rows.at(-1)?.user_id;
      const page =
        id && direction
          ? await social<PublicProfile[]>(supabase, "connections", {
              id,
              direction,
              after,
            })
          : await searchPeople(supabase, query, after);
      if (run.current === current) {
        setRows((old) => (reset ? page : [...old, ...page]));
        setMore(page.length === 20);
      }
    } catch (e) {
      if (run.current === current)
        setMessage(e instanceof Error ? e.message : "Could not load people.");
    } finally {
      if (run.current === current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    setRows([]);
    setMore(false);
    const timer = setTimeout(() => void load(true), 250);
    return () => {
      clearTimeout(timer);
      run.current++;
      lock.current = false;
    };
  }, [query, id, direction, attempt, session?.user.id]);
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
      {!id ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 24, backgroundColor: colors.canvas, marginBottom: 16 }}><Icon name="search" color={colors.muted} size={19} /><TextInput
          accessibilityLabel="Search public people"
          placeholder="Search people"
          placeholderTextColor={colors.muted}
          value={query}
          maxLength={80}
          onChangeText={setQuery}
          autoCapitalize="none"
          style={{
            flex: 1,
            minHeight: 48,
            paddingVertical: 12,
            color: colors.ink,
            fontSize: 15,
          }}
        /></View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(p) => p.user_id}
        keyboardShouldPersistTaps="handled"
        refreshing={busy}
        onRefresh={() => setAttempt((n) => n + 1)}
        renderItem={({ item }) => <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 }}><AuthorLink profile={item} /></View>}
        ListEmptyComponent={
          busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <EmptyState icon="person" title="Find your people" detail="Search a name or handle to discover voices to follow." />
          )
        }
        ListFooterComponent={
          <>
            {message ? (
              <Text accessibilityLiveRegion="polite">{message}</Text>
            ) : null}
            {message ? <Pressable accessibilityRole="button" style={actionStyle} disabled={busy} onPress={() => void load(true)}><Text style={linkStyle}>Try again</Text></Pressable> : null}
            {more ? (
              <Pressable
                accessibilityRole="button"
                style={actionStyle}
                disabled={busy}
                onPress={() => void load(false)}
              >
                <Text style={linkStyle}>Load more people</Text>
              </Pressable>
            ) : null}
          </>
        }
      />
    </View>
  );
}
