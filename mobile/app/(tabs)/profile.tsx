import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { ProfileView } from "../../components/ProfileView";
import { actionStyle, linkStyle } from "../../components/SocialUI";
import { useAuth } from "../../lib/auth";
export default function Profile() {
  const { ready, session, profile } = useAuth();
  const router = useRouter();
  return (
    <Screen title="Profile" subtitle="Your voice on Samvad">
      {!ready ? (
        <Text>Restoring account?</Text>
      ) : session && profile ? (
        <ProfileView key={session.user.id} id={session.user.id} />
      ) : (
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
