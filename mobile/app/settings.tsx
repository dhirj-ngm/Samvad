import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { OwnPosts } from "../components/OwnPosts";
import { actionStyle, linkStyle } from "../components/SocialUI";
import { useAuth } from "../lib/auth";
import { languageLabel } from "../lib/languages";
import { loadPendingDraft } from "../lib/onboarding";
import { social } from "../lib/social";
import { supabase } from "../lib/supabase";
export default function Settings() {
  const { session } = useAuth();
  return <AccountSettings key={session?.user.id ?? "anonymous"} />;
}
function AccountSettings() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [message, setMessage] = useState(""),
    [topics, setTopics] = useState<string[]>([]),
    [admin, setAdmin] = useState(false),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false),
    [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (session && supabase) {
        void Promise.all([
          supabase
            .from("user_interests")
            .select("interest_id,interests(label)")
            .eq("user_id", session.user.id),
          social<boolean>(supabase, "admin_status", {}, session.user.id),
          loadPendingDraft(session.user.id),
        ])
          .then(([selection, isAdmin, draft]) => {
            if (!alive) return;
            if (selection.error) throw selection.error;
            setTopics(
              (selection.data ?? []).flatMap((row) => {
                const i = row.interests as unknown as { label: string } | null;
                return i ? [i.label] : [];
              }),
            );
            setAdmin(isAdmin);
            setPending(!!draft);
            setMessage("");
          })
          .catch(() => {
            if (alive)
              setMessage("Preferences could not be loaded. Retry below.");
          });
      }
      return () => {
        alive = false;
      };
    }, [session?.user.id, profile, attempt]),
  );
  async function logout() {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace("/(tabs)/profile");
    } catch {
      setMessage("Sign out was not confirmed. Check your connection and retry.");
    } finally { setBusy(false); }
  }
  return (
    <Screen
      title="Private settings"
      subtitle="Visible only in your signed-in account"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
      >
        <Pressable
          style={actionStyle}
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Text style={linkStyle}>Back</Text>
        </Pressable>
        {session ? (
          <View>
            {saved === "1" ? (
              <Text accessibilityLiveRegion="polite" style={{ lineHeight: 24 }}>
                Profile, language and interests saved and confirmed.
              </Text>
            ) : null}
            <Text style={{ lineHeight: 26 }}>
              Account email: {session.user.email}
            </Text>
            <Text style={{ lineHeight: 26 }}>
              Reading language:{" "}
              {profile
                ? languageLabel(profile.preferred_language)
                : "Finish setup"}
            </Text>
            <Text style={{ lineHeight: 26 }}>
              My interests:{" "}
              {topics.length
                ? topics.join(" · ")
                : "All topics (no selections)"}
            </Text>
            {pending ? (
              <Text>
                A previous profile save needs confirmation. Resume editing to
                retry.
              </Text>
            ) : null}
            <Pressable
              style={actionStyle}
              accessibilityRole="link"
              onPress={() => router.push("/onboarding")}
            >
              <Text style={linkStyle}>Edit profile / language / interests</Text>
            </Pressable>
            {admin ? (
              <Pressable
                style={actionStyle}
                accessibilityRole="link"
                onPress={() => router.push("/review")}
              >
                <Text style={linkStyle}>Human report review</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={actionStyle}
              accessibilityRole="button"
              onPress={() => setAttempt((n) => n + 1)}
            >
              <Text style={linkStyle}>Refresh preferences</Text>
            </Pressable>
            <Pressable
              style={actionStyle}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void logout()}
            >
              <Text style={linkStyle}>
                {busy ? "Signing out…" : "Sign out"}
              </Text>
            </Pressable>
            {profile ? (
              <OwnPosts key={session.user.id} actor={session.user.id} />
            ) : null}
          </View>
        ) : (
          <Text>Sign in to manage account preferences.</Text>
        )}
        {message ? (
          <Text accessibilityLiveRegion="polite">{message}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
