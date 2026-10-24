import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { social } from "../lib/social";
import { supabase } from "../lib/supabase";
import type { ProfileState } from "../types/contracts";
import { Avatar, actionStyle, linkStyle } from "./SocialUI";
import { colors } from "../theme/tokens";
import { languageLabel } from "../lib/languages";
import { Icon } from "./Icon";
import { SegmentedTabs } from "./UI";
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
  const header = <View>
    <View style={styles.cover} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.coverRing} /><View style={styles.coverDot} />
      <Text style={styles.coverText}>Many voices. One conversation.</Text>
    </View>
    <View style={styles.profile}>
      {state ? <>
        <View style={styles.identityRow}>
          <View style={styles.avatar}><Avatar profile={state.profile} size={76} /></View>
          {session?.user.id === id ? <Pressable accessibilityRole="button" style={styles.editButton} onPress={() => router.push('/onboarding')}><Text style={styles.editText}>Edit profile</Text></Pressable> :
            <Pressable style={[styles.editButton, !state.is_following && styles.followButton]} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: state.is_following, disabled: busy }} onPress={() => void follow(pending ?? !state.is_following)}>
              <Text style={[styles.editText, !state.is_following && {color:colors.surface}]}>{busy ? 'Saving…' : pending !== null ? 'Retry follow' : state.is_following ? 'Following' : 'Follow'}</Text>
            </Pressable>}
        </View>
        <Text style={styles.name}>{state.profile.display_name || state.profile.handle}</Text>
        <Text style={styles.handle}>@{state.profile.handle}</Text>
        {state.profile.bio ? <Text style={styles.bio}>{state.profile.bio}</Text> : null}
        <View style={styles.language}><Icon name="globe" size={15} color={colors.muted} /><Text style={styles.handle}>{languageLabel(state.profile.preferred_language)}</Text></View>
        <View style={styles.counts}>{(['following', 'followers'] as const).map(direction => <Pressable key={direction} style={styles.countButton} accessibilityRole="link" onPress={() => router.push({ pathname:'/connections/[id]', params:{id,direction} })}>
          <Text style={styles.count}>{state[direction]} <Text style={styles.countLabel}>{direction === 'following' ? 'Following' : 'Followers'}</Text></Text>
        </Pressable>)}<Pressable style={styles.countButton} accessibilityRole="button" accessibilityLabel="Refresh profile" disabled={busy} onPress={() => void load()}><Icon name="repost" size={17} color={colors.muted}/></Pressable></View>
        {session?.user.id === id ? <View style={styles.preferences}>
          <Pressable accessibilityRole="button" style={styles.preference} onPress={() => router.push('/onboarding')}><Icon name="globe" size={19} color={colors.accent} /><Text style={styles.preferenceText}>Language & interests</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.preference} onPress={() => router.push('/settings')}><Icon name="settings" size={19} color={colors.accent} /><Text style={styles.preferenceText}>Settings</Text></Pressable>
        </View> : null}
      </> : !message ? <ActivityIndicator color={colors.accent} style={{margin:24}} /> : null}
      {message ? <View><Text accessibilityLiveRegion="polite" style={styles.handle}>{message}</Text><Pressable style={actionStyle} accessibilityRole="button" disabled={busy} onPress={() => void load()}><Text style={linkStyle}>Try again</Text></Pressable></View> : null}
    </View>
    <SegmentedTabs options={[{value:'posts',label:'Posts'},{value:'reposts',label:'Reposts'}]} value={tab} onChange={setTab} />
  </View>;
  return (
    <SocialFeed
      key={`${id}:${tab}:${session?.user.id ?? "public"}`}
      mode={tab}
      id={id}
      header={header}
    />
  );
}

const styles = StyleSheet.create({
  cover: { height: 112, backgroundColor: '#0C6665', overflow: 'hidden', padding: 20, justifyContent: 'center' },
  coverRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 26, borderColor: '#21807C', right: -24, top: -74 },
  coverDot: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: colors.warm, right: 70, bottom: -61 },
  coverText: { color: '#DDF1EA', fontSize: 12, fontWeight: '600', letterSpacing: .4, marginBottom: 14 },
  profile: { paddingHorizontal: 20, paddingBottom: 16 },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -30, marginBottom: 12 },
  avatar: { borderWidth: 4, borderColor: colors.surface, borderRadius: 44, backgroundColor: colors.surface },
  editButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 22, minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: colors.surface },
  editText: { color: colors.ink, fontWeight: '700', fontSize: 13 }, followButton: { backgroundColor: colors.accent, borderColor: colors.accent },
  name: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -.5 },
  handle: { color: colors.muted, fontSize: 13, lineHeight: 20 }, bio: { color: colors.ink, fontSize: 15, lineHeight: 23, marginTop: 12 },
  language: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  counts: { flexDirection: 'row', gap: 20, marginTop: 4 }, countButton: { minHeight: 44, justifyContent: 'center' },
  count: { color: colors.ink, fontSize: 14, fontWeight: '800' }, countLabel: { color: colors.muted, fontWeight: '400' },
  preferences: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  preference: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.canvas, borderRadius: 12, minHeight: 44, paddingHorizontal: 12 },
  preferenceText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
});
