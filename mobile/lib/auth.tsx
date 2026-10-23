import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { PublicProfile } from '../types/contracts';

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: PublicProfile | null;
  refreshProfile: () => Promise<PublicProfile | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!supabase) { setProfile(null); return null; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setProfile(null); return null; }
    const { data, error } = await supabase.from('profiles')
      .select('user_id,handle,display_name,bio,preferred_language')
      .eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    const current = data as PublicProfile | null;
    setProfile(current);
    return current;
  }, []);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.warn('Session restore failed:', error.message);
      setSession(data.session);
      setReady(true);
    }).catch(error => {
      if (mounted) { console.warn('Session restore failed:', String(error)); setReady(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) { setSession(nextSession); if (!nextSession) setProfile(null); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!ready || !session) return;
    refreshProfile().catch(error => console.warn('Profile load failed:', String(error)));
  }, [ready, session?.user.id, refreshProfile]);

  const value = useMemo(() => ({ ready, session, profile, refreshProfile }), [ready, session, profile, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
