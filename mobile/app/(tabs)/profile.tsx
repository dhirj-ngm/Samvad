import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/UI";
import { colors } from "../../theme/tokens";
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
        <Text style={{padding:24,color:colors.muted}}>Restoring account…</Text>
      ) : session && profile ? (
        <ProfileView key={session.user.id} id={session.user.id} />
      ) : session && profileError ? null : (
        <View>
          <EmptyState icon="person" title={session ? "Make yourself at home" : "Your voice belongs here"}
            detail={session ? "Choose a name, your reading language, and the topics you enjoy." : "Follow interesting people and join conversations in your language."}
            action={session ? "Complete profile" : "Sign in"} onAction={() => router.push(session ? "/onboarding" : "/sign-in")} />
          {!session ? (
            <Pressable
              style={[actionStyle,{alignItems:"center"}]}
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
