import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { initiallySeen } from '../data/sample';

/** Husker, hvilke moments man har set i denne omgang (nulstilles ved genindlæsning). */
type MomentsState = { seen: string[]; markSeen: (personId: string) => void };

const Ctx = createContext<MomentsState | null>(null);

export function MomentsProvider({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState<string[]>(initiallySeen);
  const markSeen = useCallback((id: string) => setSeen((s) => (s.includes(id) ? s : [...s, id])), []);
  const value = useMemo(() => ({ seen, markSeen }), [seen, markSeen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMoments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMoments skal bruges inden i MomentsProvider');
  return ctx;
}
