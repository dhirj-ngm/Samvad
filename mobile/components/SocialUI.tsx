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
import { Icon } from "./Icon";
import { colors } from "../theme/tokens";

export const actionStyle = {
  minHeight: 48,
  paddingHorizontal: 12,
  paddingVertical: 12,
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
        minHeight: 48,
        paddingVertical: 8,
        flexShrink: 1,
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
      <Avatar profile={profile} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>
          {profile.display_name || profile.handle}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>@{profile.handle}</Text>
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
  return <View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 2 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Reply to this conversation" style={{ ...actionStyle, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 0 }} onPress={onReply}>
        <Icon name="chat" size={19} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 12 }}>Reply</Text>
      </Pressable>
      {confirmed ? (['repost', 'like'] as const).map(action => {
        const active = action === 'like' ? confirmed.liked : confirmed.reposted;
        const count = action === 'like' ? confirmed.likes : confirmed.reposts;
        const tint = active ? (action === 'like' ? colors.danger : colors.accent) : colors.muted;
        return <Pressable key={action} disabled={busy || !!pending} accessibilityRole="button"
          accessibilityState={{ selected: active, disabled: busy || !!pending }}
          accessibilityLabel={`${active ? 'Undo ' : ''}${action}; ${count}`}
          style={{ ...actionStyle, flexDirection: 'row', alignItems: 'center', gap: 7 }}
          onPress={() => void write(action, !active)}>
          <Icon name={action === 'like' ? 'heart' : 'repost'} size={20} color={tint} filled={active} />
          <Text style={{ color: tint, fontSize: 12 }}>{count || (action === 'like' ? 'Like' : 'Repost')}</Text>
        </Pressable>;
      }) : <Text style={{ color: colors.muted, fontSize: 12, alignSelf: 'center' }}>Likes unavailable</Text>}
    </View>
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: colors.warning, fontSize: 13, lineHeight: 20 }}>{message}</Text> : null}
    {pending ? <Pressable disabled={busy} accessibilityRole="button" style={actionStyle} onPress={() => void write(pending.action, pending.desired)}>
      <Text style={linkStyle}>{busy ? 'Saving…' : `Try ${pending.action} again`}</Text>
    </Pressable> : null}
  </View>;
}
