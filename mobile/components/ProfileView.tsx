import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { social } from "../lib/social";
import { supabase } from "../lib/supabase";
import type { ProfileState } from "../types/contracts";
import { Avatar, actionStyle, linkStyle } from "./SocialUI";
import { SocialFeed } from "./SocialFeed";
export function ProfileView({ id }: { id: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ProfileState | null>(null),
    [message, setMessage] = useState("Loading profile…");
  const [tab, setTab] = useState<"posts" | "reposts">("posts"),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<boolean | null>(null);
  const lock = useRef(false),
    alive = useRef(true);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (lock.current) return;
    const run = ++generation.current;
    setMessage("");
    try {
      if (!supabase) throw new Error("Backend unavailable.");
      const r = await social<ProfileState>(supabase, "profile", { id });
      if (alive.current && run === generation.current) setState(r);
    } catch (e) {
      if (alive.current && run === generation.current)
        setMessage(e instanceof Error ? e.message : "Profile unavailable.");
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void load();
      return () => {
        alive.current = false;
        generation.current++;
      };
    }, [load]),
  );
  async function follow(desired: boolean) {
    if (lock.current) return;
    if (!session) {
      router.push("/sign-in");
      return;
    }
    lock.current = true;
    generation.current++; // A pre-mutation read must not undo this confirmed desired state.
    setBusy(true);
    setPending(desired);
    setMessage("");
    try {
      if (!supabase) throw new Error("Backend unavailable.");
      const r = await social<ProfileState>(
        supabase,
        "follow",
        { id, desired },
        session.user.id,
      );
      if (alive.current) {
        setState(r);
        setPending(null);
      }
    } catch (e) {
      if (alive.current)
        setMessage(e instanceof Error ? e.message : "Save unconfirmed.");
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const header = (
    <View style={{ gap: 8 }}>
      {state ? (
        <>
          <Avatar profile={state.profile} size={72} />
          <Text style={{ fontSize: 24, fontWeight: "700", lineHeight: 34 }}>
            {state.profile.display_name || `@${state.profile.handle}`}
          </Text>
          <Text>@{state.profile.handle}</Text>
          {state.profile.bio ? (
            <Text style={{ fontSize: 16, lineHeight: 26 }}>
              {state.profile.bio}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {(["followers", "following"] as const).map((direction) => (
              <Pressable
                style={actionStyle}
                accessibilityRole="link"
                key={direction}
                onPress={() =>
                  router.push({
                    pathname: "/connections/[id]",
                    params: { id, direction },
                  })
                }
              >
                <Text style={linkStyle}>
                  {state[direction]} {direction}
                </Text>
              </Pressable>
            ))}
          </View>
          {session?.user.id === id ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <Pressable
                accessibilityRole="link"
                style={actionStyle}
                onPress={() => router.push("/onboarding")}
              >
                <Text style={linkStyle}>Edit profile & preferences</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                style={actionStyle}
                onPress={() => router.push("/settings")}
              >
                <Text style={linkStyle}>Private settings / submissions</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={actionStyle}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{
                selected: state.is_following,
                disabled: busy,
              }}
              onPress={() => void follow(pending ?? !state.is_following)}
            >
              <Text style={linkStyle}>
                {busy
                  ? "Saving…"
                  : pending !== null
                    ? "Retry same follow state"
                    : state.is_following
                      ? "Unfollow"
                      : "Follow"}
              </Text>
            </Pressable>
          )}
        </>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ lineHeight: 24 }}>
          {message}
        </Text>
      ) : null}
      <Pressable
        style={actionStyle}
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void load()}
      >
        <Text style={linkStyle}>Refresh profile</Text>
      </Pressable>
      <View style={{ flexDirection: "row" }}>
        {(["posts", "reposts"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t }}
            style={actionStyle}
            onPress={() => setTab(t)}
          >
            <Text style={linkStyle}>{t === "posts" ? "Posts" : "Reposts"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
  return (
    <SocialFeed
      key={`${id}:${tab}:${session?.user.id ?? "public"}`}
      mode={tab}
      id={id}
      header={header}
    />
  );
}
