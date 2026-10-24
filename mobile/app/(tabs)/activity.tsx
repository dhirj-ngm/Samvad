import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { EmptyState } from '../../components/UI';
export default function Activity() {
  const router = useRouter();
  return <Screen title="Activity"><EmptyState icon="bell" title="A little quieter here, for now" detail="Notifications are coming soon. In the meantime, find a conversation worth joining." action="Explore conversations" onAction={() => router.push('/(tabs)/explore')} /></Screen>;
}
