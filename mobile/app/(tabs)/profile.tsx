import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { ProfileView } from "../../components/ProfileView";
import { actionStyle, linkStyle } from "../../components/SocialUI";
import { useAuth } from "../../lib/auth";
export default function Profile() {
  const { ready, session, profile, profileLoading, profileError, refreshProfile } = useAuth();
  const router = useRouter();
  return (
    <Screen title="Profile" subtitle="Your voice on Samvad">
      {session && profileError ? <View style={{ paddingHorizontal: 24 }}>
        <Text accessibilityLiveRegion="polite">{profileError}</Text>
        <Pressable style={actionStyle} accessibilityRole="button" disabled={profileLoading}
          onPress={() => void refreshProfile().catch(() => {})}>
          <Text style={linkStyle}>{profileLoading ? 'Loading profile…' : 'Retry loading profile'}</Text>
        </Pressable>
      </View> : null}
      {!ready || (session && !profile && profileLoading) ? (
        <Text>Restoring account…</Text>
      ) : session && profile ? (
        <ProfileView key={session.user.id} id={session.user.id} />
      ) : session && profileError ? null : (
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 20, lineHeight: 30 }}>
            {session
              ? "Finish your public profile"
              : "Join the conversation with a public pseudonym"}
          </Text>
          <Pressable
            style={actionStyle}
            accessibilityRole="link"
            onPress={() => router.push(session ? "/onboarding" : "/sign-in")}
          >
            <Text style={linkStyle}>
              {session ? "Resume setup" : "Sign in"}
            </Text>
          </Pressable>
          {!session ? (
            <Pressable
              style={actionStyle}
              accessibilityRole="link"
              onPress={() => router.push("/sign-up")}
            >
              <Text style={linkStyle}>Create account</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
