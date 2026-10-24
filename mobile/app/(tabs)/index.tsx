import { useState } from 'react';
import { SocialFeed } from '../../components/SocialFeed';
import { Screen } from '../../components/Screen';
import { DiscoveryFeed } from '../../components/DiscoveryFeed';
import { SegmentedTabs } from '../../components/UI';
import { useAuth } from '../../lib/auth';

export default function Home() {
  const [mode, setMode] = useState<'discover' | 'following'>('discover');
  const { session, profile, preferenceVersion } = useAuth();
  return <Screen title="Home" subtitle="Your voice. Every language.">
    <SegmentedTabs options={[{value:'discover',label:'For you'},{value:'following',label:'Following'}]} value={mode} onChange={setMode} />
    {mode === 'following' ? <SocialFeed key={session?.user.id ?? 'public'} mode="following" /> :
      <DiscoveryFeed key={`${session?.user.id ?? 'public'}:${profile?.preferred_language ?? 'en'}:${preferenceVersion}`} />}
  </Screen>;
}
