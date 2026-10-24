import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { ProfileView } from "../../components/ProfileView";
import { useAuth } from "../../lib/auth";
import { actionStyle, linkStyle } from "../../components/SocialUI";
export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  return (
    <Screen back title="Profile">
      <ProfileView key={`${id}:${session?.user.id ?? "public"}`} id={id} />
    </Screen>
  );
}
