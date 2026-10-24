import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { Screen } from "../components/Screen";
import { People } from "../components/People";
import { actionStyle, linkStyle } from "../components/SocialUI";
export default function PeopleScreen() {
  const router = useRouter();
  return (
    <Screen title="People" subtitle="Find public voices across languages">
      <Pressable
        style={actionStyle}
        accessibilityRole="button"
        onPress={() => router.back()}
      >
        <Text style={linkStyle}>Back</Text>
      </Pressable>
      <People />
    </Screen>
  );
}
