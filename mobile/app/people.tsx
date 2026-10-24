import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { Screen } from "../components/Screen";
import { People } from "../components/People";
import { actionStyle, linkStyle } from "../components/SocialUI";
export default function PeopleScreen() {
  const router = useRouter();
  return (
    <Screen back title="People" subtitle="Find public voices across languages">
      <People />
    </Screen>
  );
}
