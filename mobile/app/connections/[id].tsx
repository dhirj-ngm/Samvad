import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { People } from "../../components/People";
import { actionStyle, linkStyle } from "../../components/SocialUI";
export default function Connections() {
  const { id, direction } = useLocalSearchParams<{
    id: string;
    direction: string;
  }>();
  const router = useRouter();
  const mode = direction === "following" ? "following" : "followers";
  return (
    <Screen title={mode === "following" ? "Following" : "Followers"}>
      <Pressable
        style={actionStyle}
        accessibilityRole="button"
        onPress={() => router.back()}
      >
        <Text style={linkStyle}>Back</Text>
      </Pressable>
      <People id={id} direction={mode} />
    </Screen>
  );
}
