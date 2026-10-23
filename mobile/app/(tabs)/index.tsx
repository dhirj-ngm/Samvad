import { Screen } from '../../components/Screen';
import { DiscoveryFeed } from '../../components/DiscoveryFeed';
import { useAuth } from '../../lib/auth';

export default function Home() {
  const { session, profile } = useAuth();
  return <Screen title="Home" subtitle="Open conversations across India">
    <DiscoveryFeed key={`${session?.user.id ?? 'public'}:${profile?.preferred_language ?? 'en'}`} />
  </Screen>;
}
