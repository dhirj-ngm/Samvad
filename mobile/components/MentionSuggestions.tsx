import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { insertMention, mentionQuery, searchPeople } from "../lib/social";
import { supabase } from "../lib/supabase";
import type { PublicProfile } from "../types/contracts";
import { actionStyle, linkStyle } from "./SocialUI";
export function MentionSuggestions({
  text,
  cursor,
  onInsert,
}: {
  text: string;
  cursor: number;
  onInsert: (text: string, cursor: number) => void;
}) {
  const [people, setPeople] = useState<PublicProfile[]>([]),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const query = mentionQuery(text, cursor);
  useEffect(() => {
    let alive = true;
    setPeople([]);
    setError(false);
    const timer = setTimeout(() => {
      if (query !== null && supabase)
        void searchPeople(supabase, query)
          .then((rows) => {
            if (alive) setPeople(rows.slice(0, 5));
          })
          .catch(() => {
            if (alive) setError(true);
          });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, retry]);
  if (query === null) return null;
  return (
    <View accessibilityLabel="Mention suggestions">
      <Text>Choose a public handle. Unknown handles remain text.</Text>
      {people.map((p) => (
        <Pressable
          style={actionStyle}
          accessibilityRole="button"
          key={p.user_id}
          onPress={() => {
            const next = insertMention(text, cursor, p.handle);
            onInsert(next.text, next.cursor);
          }}
        >
          <Text style={linkStyle}>
            @{p.handle} · {p.display_name}
          </Text>
        </Pressable>
      ))}
      {error ? (
        <Pressable
          style={actionStyle}
          accessibilityRole="button"
          onPress={() => setRetry((n) => n + 1)}
        >
          <Text style={linkStyle}>Suggestions unavailable · retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
