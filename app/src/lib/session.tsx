import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { openedFromRecoveryLink, supabase } from './supabase';
import type { Profile } from './types';

type Ctx = {
  /** undefined = indlæser stadig */
  session: Session | null | undefined;
  /** null = logget ind, men har ikke oprettet profil endnu */
  profile: Profile | null | undefined;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Man har trykket på linket i "glemt adgangskode"-mailen og skal vælge en ny */
  recovering: boolean;
  doneRecovering: () => void;
};

const SessionContext = createContext<Ctx | null>(null);

/** Holder styr på login og din egen profil i hele appen */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(session === null ? null : undefined);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, [userId, session]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return <SessionContext.Provider value={{ session, profile, refreshProfile, signOut, recovering, doneRecovering: () => setRecovering(false) }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const c = useContext(SessionContext);
  if (!c) throw new Error('useSession uden SessionProvider');
  return c;
}

/** Din egen profil – kun til skærme bag login, hvor den altid findes */
export function useMe() {
  const { profile } = useSession();
  if (!profile) throw new Error('Ingen profil');
  return profile;
}
