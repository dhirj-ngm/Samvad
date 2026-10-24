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
    <Screen back title={mode === "following" ? "Following" : "Followers"}>
      <People id={id} direction={mode} />
    </Screen>
  );
}
