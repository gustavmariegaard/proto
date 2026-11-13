import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/*
 * En lille "session" i stedet for rigtig login.
 * Den huskes i browseren på telefonen, så man ikke skal oprette
 * sig igen, hver gang appen åbnes. Ingen data sendes nogen steder hen.
 */

export type Profile = {
  name: string;
  username: string;
  interests: string[];
  /** Billede valgt fra telefonen (kun gemt lokalt) */
  avatar?: string;
  /** Privat profil: kun følgere kan se ens opslag, moments og flicks (som på Instagram) */
  private?: boolean;
};

type SessionState = {
  loggedIn: boolean;
  country: string;
  profile: Profile;
};

type Session = SessionState & {
  setCountry: (country: string) => void;
  setProfile: (profile: Profile) => void;
  logIn: () => void;
  logOut: () => void;
};

const KEY = 'ciircle.session';

const interests = ['Kultur', 'Byudvikling', 'Musik', 'Cykling', 'Madlavning'];

/** Udlogget: velkomst og oprettelse vises (efter "Log ud" i Indstillinger) */
const loggedOutState: SessionState & { loggedOut: true } = {
  loggedIn: false,
  loggedOut: true,
  country: 'Danmark',
  profile: { name: '', username: '', interests },
};

/**
 * Til test: man er logget ind fra start med en testprofil og lander direkte på Hjem.
 * Vil man prøve velkomst og oprettelse, trykker man "Log ud" i Indstillinger.
 */
const initial: SessionState = {
  loggedIn: true,
  country: 'Danmark',
  profile: { name: 'Sara Jensen', username: 'sara.jensen', interests },
};

function load(): SessionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<SessionState> & { loggedOut?: boolean };
      // Kun et bevidst "Log ud" holder én logget ud; ellers lander man på Hjem
      if (stored.loggedOut) return { ...loggedOutState, ...stored };
      return { ...initial, ...stored, loggedIn: true, profile: { ...initial.profile, ...stored.profile, name: stored.profile?.name || initial.profile.name } };
    }
  } catch {
    /* Privat vindue eller blokeret lager: start som testbruger */
  }
  return initial;
}

function save(state: SessionState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Ignorer: appen virker stadig, den husker bare ikke */
  }
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(load);

  const update = useCallback((patch: Partial<SessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  // Faste funktioner, så skærme trygt kan bruge dem i useEffect.
  const actions = useMemo(
    () => ({
      setCountry: (country: string) => update({ country }),
      setProfile: (profile: Profile) => update({ profile }),
      logIn: () => update({ loggedIn: true, loggedOut: false } as Partial<SessionState>),
      logOut: () => {
        save(loggedOutState);
        setState(loggedOutState);
      },
    }),
    [update],
  );

  const value = useMemo<Session>(() => ({ ...state, ...actions }), [state, actions]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession skal bruges inden i SessionProvider');
  return ctx;
}
