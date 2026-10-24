import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { createProfileLoader, type ProfileLoadState } from "./profile-loader";
import type { PublicProfile } from "../types/contracts";

type AuthState = {
  preferenceVersion: number;
  ready: boolean;
  session: Session | null;
  profile: PublicProfile | null;
  profileLoading: boolean;
  profileError: string;
  refreshProfile: () => Promise<PublicProfile | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const account = useRef<string | null>(null);
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profileState, setProfileState] = useState<ProfileLoadState>({ profile: null, loading: false, error: '' });
  const loader = useRef<ReturnType<typeof createProfileLoader> | null>(null);
  if (!loader.current) loader.current = createProfileLoader(supabase, setProfileState);
  const { profile, loading: profileLoading, error: profileError } = profileState;

  const refreshProfile = useCallback(async () => {
    const current = await loader.current!.load();
    if (current) setPreferenceVersion((n) => n + 1);
    return current;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let mounted = true;
    let authEventReceived = false;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.warn("Session restore failed:", error.message);
        // An auth event may have arrived while persisted-session loading was pending.
        if (!authEventReceived) {
          account.current = data.session?.user.id ?? null;
          loader.current!.setActor(account.current);
          setSession(data.session);
        }
        setReady(true);
      })
      .catch((error) => {
        if (mounted) {
          console.warn("Session restore failed:", String(error));
          setReady(true);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        authEventReceived = true;
        account.current = nextSession?.user.id ?? null;
        loader.current!.setActor(account.current);
        setSession(nextSession);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
      loader.current!.invalidate();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !session) return;
    refreshProfile().catch((error) =>
      console.warn("Profile load failed:", String(error)),
    );
  }, [ready, session?.user.id, refreshProfile]);

  const value = useMemo(
    () => ({ ready, session, profile, profileLoading, profileError, refreshProfile, preferenceVersion }),
    [ready, session, profile, profileLoading, profileError, refreshProfile, preferenceVersion],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
