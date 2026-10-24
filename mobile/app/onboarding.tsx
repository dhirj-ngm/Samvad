import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import {
  clearPendingDraft,
  loadPendingDraft,
  savePendingDraft,
} from "../lib/onboarding";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, type } from "../theme/tokens";
import type { Interest, LanguageCode } from "../types/contracts";

import { languages } from "../lib/languages";
import { social } from "../lib/social";
import { AvatarEditor } from "../components/AvatarEditor";
import type { PublicProfile } from "../types/contracts";

export default function Onboarding() {
  const { session } = useAuth();
  return <OnboardingAccount key={session?.user.id ?? "anonymous"} />;
}
function OnboardingAccount() {
  const router = useRouter();
  const { ready, session, refreshProfile } = useAuth();
  const lock = useRef(false);
  const alive = useRef(true);
  const [avatarBusy, setAvatarBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [oldAvatar, setOldAvatar] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [handle, setHandle] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (ready && !session) router.replace("/sign-in");
  }, [ready, session, router]);

  useEffect(() => {
    if (!supabase || !session) return;
    let mounted = true;
    setLoading(true);
    setLoadFailed(false);
    (async () => {
      try {
        const [
          { data: topics, error: topicsError },
          { data: choices, error: choicesError },
          { data: savedProfile, error: savedProfileError },
          pending,
        ] = await Promise.all([
          supabase.from("interests").select("id,slug,label").order("label"),
          supabase
            .from("user_interests")
            .select("interest_id")
            .eq("user_id", session.user.id),
          supabase
            .from("profiles")
            .select(
              "user_id,handle,display_name,bio,preferred_language,avatar_path",
            )
            .eq("user_id", session.user.id)
            .maybeSingle(),
          loadPendingDraft(session.user.id),
        ]);
        if (topicsError) throw topicsError;
        if (choicesError) throw choicesError;
        if (savedProfileError) throw savedProfileError;
        if (!mounted) return;
        setDisplayName(
          pending?.displayName ?? savedProfile?.display_name ?? "",
        );
        setBio(pending?.bio ?? savedProfile?.bio ?? "");
        setAvatarPath(
          pending?.avatarPath === undefined
            ? (savedProfile?.avatar_path ?? null)
            : pending.avatarPath,
        );
        setOldAvatar(savedProfile?.avatar_path ?? null);
        setInterests((topics ?? []) as Interest[]);
        setHandle(pending?.handle ?? savedProfile?.handle ?? "");
        setLanguage(
          pending?.language ??
            (savedProfile?.preferred_language as LanguageCode | undefined) ??
            "en",
        );
        setSelected(
          pending?.interestIds ?? (choices ?? []).map((row) => row.interest_id),
        );
      } catch (error) {
        if (mounted) {
          setLoadFailed(true);
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load interests.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user.id, attempt]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function save() {
    if (!supabase || !session || lock.current || loadFailed || avatarBusy)
      return;
    const normalized = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
      setMessage("Handle: 3–30 lowercase letters, numbers, or underscores.");
      return;
    }
    if (
      [
        "admin",
        "administrator",
        "samvad",
        "support",
        "moderator",
        "system",
      ].includes(normalized)
    ) {
      setMessage("Choose another handle.");
      return;
    }
    if (Array.from(displayName).length > 80 || Array.from(bio).length > 280) {
      setMessage("Display name: up to 80 characters; bio: up to 280.");
      return;
    }
    lock.current = true;
    setSaving(true);
    setMessage("");
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user || user.id !== session.user.id)
        throw new Error("Sign in again before saving.");
      const draft = {
        handle: normalized,
        language,
        interestIds: selected,
        displayName,
        bio,
        avatarPath,
      };
      await savePendingDraft(user.id, draft);
      const saved = await social<PublicProfile>(
        supabase,
        "save_profile",
        {
          handle: normalized,
          display_name: displayName,
          bio,
          language,
          interests: selected,
          avatar_path: avatarPath,
        },
        user.id,
      );
      if (
        saved.user_id !== user.id ||
        saved.handle !== normalized ||
        saved.preferred_language !== language ||
        saved.display_name !== displayName ||
        saved.bio !== bio ||
        saved.avatar_path !== avatarPath
      )
        throw new Error(
          "Profile save was not confirmed. Retry the same preferences.",
        );
      // Only delete the previous object after the new profile is confirmed durable.
      if (oldAvatar && oldAvatar !== avatarPath) {
        const {
          data: { session: current },
        } = await supabase.auth.getSession();
        if (current?.user.id === user.id)
          await supabase.storage.from("avatars").remove([oldAvatar]);
      }
      await refreshProfile();
      await clearPendingDraft(user.id);
      if (!alive.current) return;
      router.replace({ pathname: "/settings", params: { saved: "1" } });
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      setMessage(
        code === "23505"
          ? "That handle is taken. Choose another."
          : error instanceof Error
            ? error.message
            : "Could not save. Please retry.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  if (!ready || loading)
    return (
      <Screen title="Set up your profile">
        <Text style={styles.info}>Loading your account…</Text>
      </Screen>
    );
  if (loadFailed)
    return (
      <Screen title="Profile setup">
        <Text style={styles.info}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAttempt((n) => n + 1)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retry loading profile</Text>
        </Pressable>
      </Screen>
    );
  return (
    <Screen
      title="Your Samvad profile"
      subtitle="Your public identity and private reading preferences."
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text style={styles.label}>1 · Public identity</Text>
          <Text style={styles.info}>
            A pseudonym is welcome. Your email is never shown on this profile.
          </Text>
          <Text style={styles.label}>Public handle</Text>
          <TextInput
            style={styles.input}
            editable={!saving}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            placeholder="your_handle"
            accessibilityLabel="Public handle"
          />
          <Text style={styles.label}>
            Display name (optional · 80 characters)
          </Text>
          <TextInput
            editable={!saving}
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            accessibilityLabel="Public display name"
          />
          <Text style={styles.label}>Bio (optional · 280 characters)</Text>
          <TextInput
            editable={!saving}
            multiline
            style={styles.input}
            value={bio}
            onChangeText={setBio}
            accessibilityLabel="Public bio"
          />
          {session ? (
            <AvatarEditor
              key={session.user.id}
              actor={session.user.id}
              path={avatarPath}
              disabled={saving}
              onChange={setAvatarPath}
              onBusyChange={setAvatarBusy}
            />
          ) : null}
          <Text style={styles.label}>2 · Reading language</Text>
          <Text style={styles.info}>
            Used for supported on-demand translation. Original text stays
            available. This does not translate the entire app interface.
          </Text>
          <View style={styles.row}>
            {languages.map((item) => (
              <Pressable
                key={item.code}
                disabled={saving}
                onPress={() => setLanguage(item.code)}
                style={[styles.choice, language === item.code && styles.active]}
                accessibilityRole="radio"
                accessibilityState={{ selected: language === item.code }}
              >
                <Text style={styles.choiceText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>3 · Interests (optional)</Text>
          <Text style={styles.hint}>
            Pick a few now, or leave them empty and edit later.
          </Text>
          <View style={styles.row}>
            {interests.map((item) => (
              <Pressable
                key={item.id}
                disabled={saving}
                onPress={() => toggle(item.id)}
                style={[
                  styles.choice,
                  selected.includes(item.id) && styles.active,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected.includes(item.id) }}
              >
                <Text style={styles.choiceText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {message ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}
          <Pressable
            onPress={save}
            disabled={saving || !session || avatarBusy}
            style={[styles.button, (saving || !session) && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>
              {saving ? "Saving…" : "Save profile"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(tabs)/profile")}
            accessibilityRole="link"
          >
            <Text style={styles.link}>Back to Profile</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  label: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: type.body,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: type.body,
    color: colors.ink,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    minHeight: 48,
    justifyContent: "center",
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  active: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  choiceText: { color: colors.ink },
  hint: { color: colors.muted },
  error: { color: colors.warning, marginTop: spacing.md, lineHeight: 21 },
  info: { color: colors.muted, padding: spacing.lg },
  button: {
    backgroundColor: colors.accent,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.lg,
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.surface, fontSize: type.body, fontWeight: "700" },
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "600",
  },
});
