import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
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
    if (reset) setRows([]);
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
    const timer = setTimeout(() => void load(true), 250);
    return () => {
      clearTimeout(timer);
      run.current++;
      lock.current = false;
    };
  }, [query, id, direction, attempt, session?.user.id]);
  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      {!id ? (
        <TextInput
          accessibilityLabel="Search public people"
          placeholder="Search @handle or display name"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          style={{
            padding: 16,
            borderWidth: 1,
            borderRadius: 12,
            marginBottom: 12,
          }}
        />
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(p) => p.user_id}
        keyboardShouldPersistTaps="handled"
        refreshing={busy}
        onRefresh={() => setAttempt((n) => n + 1)}
        renderItem={({ item }) => <AuthorLink profile={item} />}
        ListEmptyComponent={
          busy ? (
            <ActivityIndicator />
          ) : (
            <Text>No people found yet. Try another name or handle.</Text>
          )
        }
        ListFooterComponent={
          <>
            {message ? (
              <Text accessibilityLiveRegion="polite">{message}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={actionStyle}
              disabled={busy}
              onPress={() => void load(true)}
            >
              <Text style={linkStyle}>Refresh people</Text>
            </Pressable>
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
