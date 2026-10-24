import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicProfile } from '../types/contracts';

export type ProfileLoadState = { profile: PublicProfile | null; loading: boolean; error: string };

// A request belongs to both an account and a generation. A late response (including
// an error) must never overwrite a newer refresh or a different signed-in account.
export function createProfileLoader(client: SupabaseClient | null, publish: (state: ProfileLoadState) => void) {
  let actor: string | null = null;
  let version = 0;
  let profile: PublicProfile | null = null;
  return {
    setActor(next: string | null) {
      if (next === actor) return;
      actor = next;
      version++;
      profile = null;
      publish({ profile, loading: !!next, error: '' });
    },
    invalidate() { version++; },
    async load(): Promise<PublicProfile | null> {
      const request = ++version, owner = actor;
      const current = () => request === version && owner === actor;
      if (!client || !owner) return null;
      publish({ profile, loading: true, error: '' });
      try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (!current()) return null;
        if (authError || user?.id !== owner) throw new Error('Account could not be verified. Reconnect and retry.');
        const { data, error } = await client.from('profiles')
          .select('user_id,handle,display_name,bio,preferred_language,avatar_path')
          .eq('user_id', owner).maybeSingle();
        if (!current()) return null;
        if (error) throw new Error('Profile could not be loaded. Check your connection and retry.');
        if (data && data.user_id !== owner) throw new Error('Profile did not match this account. Retry.');
        profile = data as PublicProfile | null;
        publish({ profile, loading: false, error: '' });
        return profile;
      } catch (error) {
        if (!current()) return null;
        const failure = error instanceof Error ? error : new Error('Profile could not be loaded. Retry.');
        publish({ profile, loading: false, error: failure.message });
        throw failure;
      }
    },
  };
}
