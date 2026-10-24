import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SocialFeed } from "../../components/SocialFeed";
import { actionStyle, linkStyle } from "../../components/SocialUI";
import { Screen } from "../../components/Screen";
import { DiscoveryFeed } from "../../components/DiscoveryFeed";
import { useAuth } from "../../lib/auth";

export default function Home() {
  const [mode, setMode] = useState<"discover" | "following">("discover");
  const { session, profile, preferenceVersion } = useAuth();
  return (
    <Screen title="Home" subtitle="Open conversations across India">
      <View style={{ flexDirection: "row", paddingHorizontal: 12 }}>
        {(["discover", "following"] as const).map((m) => (
          <Pressable
            key={m}
            style={actionStyle}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
            onPress={() => setMode(m)}
          >
            <Text style={linkStyle}>
              {m === "discover" ? "For you" : "Following"}
            </Text>
          </Pressable>
        ))}
      </View>
      {mode === "following" ? (
        <SocialFeed key={session?.user.id ?? "public"} mode="following" />
      ) : (
        <DiscoveryFeed
          key={`${session?.user.id ?? "public"}:${profile?.preferred_language ?? "en"}:${preferenceVersion}`}
        />
      )}
    </Screen>
  );
}
