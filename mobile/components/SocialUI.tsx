import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { social } from "../lib/social";
import type {
  InteractionState,
  Mention,
  PublicProfile,
} from "../types/contracts";
import { colors } from "../theme/tokens";

export const actionStyle = {
  minHeight: 48,
  paddingHorizontal: 12,
  paddingVertical: 14,
} as const;
export const linkStyle = {
  color: colors.accent,
  fontWeight: "700" as const,
  lineHeight: 24,
};
export function Avatar({
  profile,
  size = 48,
}: {
  profile: PublicProfile;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [profile.avatar_path]);
  const url =
    profile.avatar_path &&
    supabase?.storage.from("avatars").getPublicUrl(profile.avatar_path).data
      .publicUrl;
  return url && !broken ? (
    <Image
      source={{ uri: url }}
      onError={() => setBroken(true)}
      accessibilityLabel={`Avatar of @${profile.handle}`}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      accessibilityLabel={`Avatar initials for @${profile.handle}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{ color: colors.accent, fontSize: size / 3, fontWeight: "700" }}
      >
        {Array.from(profile.display_name || profile.handle)
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </Text>
    </View>
  );
}
export function AuthorLink({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  return (
    <Pressable
      style={{
        ...actionStyle,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
      accessibilityRole="link"
      accessibilityLabel={`Open profile of @${profile.handle}`}
      onPress={() =>
        router.push({
          pathname: "/person/[id]",
          params: { id: profile.user_id },
        })
      }
    >
      <Avatar profile={profile} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={linkStyle}>
          {profile.display_name || `@${profile.handle}`}
        </Text>
        {profile.display_name ? (
          <Text style={{ color: colors.muted }}>@{profile.handle}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
export function MentionLinks({ mentions }: { mentions: Mention[] }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {mentions.map((m) => (
        <Pressable
          key={`${m.entity_id}:${m.handle}`}
          accessibilityRole="link"
          onPress={() =>
            router.push({
              pathname: "/person/[id]",
              params: { id: m.target_id },
            })
          }
          style={actionStyle}
        >
          <Text style={linkStyle}>@{m.handle}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export function SocialActions({
  id,
  state,
  onReply,
}: {
  id: string;
  state?: InteractionState;
  onReply: () => void;
}) {
  const { session, profile } = useAuth();
  const [confirmed, setConfirmed] = useState(state),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState<{
      action: "like" | "repost";
      desired: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pending) setConfirmed(state);
  }, [state]);
  async function write(action: "like" | "repost", desired: boolean) {
    if (lock.current) return;
    if (!session || !profile) {
      setMessage("Sign in and finish your profile to use social actions.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setPending({ action, desired });
    setMessage("");
    try {
      if (!supabase) throw new Error("Backend unavailable.");
      const result = await social<InteractionState>(
        supabase,
        action,
        { id, desired },
        session.user.id,
      );
      if (alive.current) {
        setConfirmed(result);
        setPending(null);
      }
    } catch (e) {
      if (alive.current)
        setMessage(e instanceof Error ? e.message : "Save not confirmed.");
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {confirmed ? (
          (["like", "repost"] as const).map((action) => {
            const active =
              action === "like" ? confirmed.liked : confirmed.reposted;
            return (
              <Pressable
                key={action}
                disabled={busy || !!pending}
                accessibilityRole="button"
                accessibilityState={{
                  selected: active,
                  disabled: busy || !!pending,
                }}
                accessibilityLabel={`${active ? "Undo " : ""}${action}; ${action === "like" ? confirmed.likes : confirmed.reposts}`}
                style={actionStyle}
                onPress={() => void write(action, !active)}
              >
                <Text style={linkStyle}>
                  {action === "like"
                    ? active
                      ? "Liked"
                      : "Like"
                    : active
                      ? "Reposted"
                      : "Repost"}{" "}
                  · {action === "like" ? confirmed.likes : confirmed.reposts}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={{ color: colors.muted, padding: 12 }}>
            Social counts unavailable. Refresh to retry.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          style={actionStyle}
          onPress={onReply}
        >
          <Text style={linkStyle}>Reply</Text>
        </Pressable>
      </View>
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.warning, lineHeight: 24 }}
        >
          {message}
        </Text>
      ) : null}
      {pending ? (
        <Pressable
          disabled={busy}
          accessibilityRole="button"
          style={actionStyle}
          onPress={() => void write(pending.action, pending.desired)}
        >
          <Text style={linkStyle}>
            {busy ? "Saving…" : `Retry same ${pending.action} state`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
