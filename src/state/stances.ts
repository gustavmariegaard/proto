import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Enig / uenig i Offentlig debat. Vises som et barometer:
 * hvor stor en andel er enige, og hvor mange har stemt i alt.
 */

export type Stance = 'enig' | 'uenig';

let stances: Record<string, Stance> = keep('stances', {});
const listeners = new Set<() => void>();
const get = () => stances;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useStances = () => useSyncExternalStore(subscribe, get, get);

/** Vælg enig eller uenig. Samme valg igen fjerner det. */
export function setStance(id: string, s: Stance) {
  const next = { ...stances };
  if (next[id] === s) delete next[id];
  else next[id] = s;
  stances = next;
  save('stances', next);
  listeners.forEach((l) => l());
}

/** Faste eksempeltal pr. opslag. Egne nye opslag starter på 0. */
const fixed: Record<string, { agree: number; disagree: number }> = {
  'd-lars': { agree: 41, disagree: 268 },
};

export function baseStances(id: string) {
  if (fixed[id]) return fixed[id];
  if (id.startsWith('mit-')) return { agree: 0, disagree: 0 };
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const total = 40 + (h % 1800);
  const share = 0.35 + ((h >>> 8) % 55) / 100;
  const agree = Math.round(total * share);
  return { agree, disagree: total - agree };
}

/** Tallene med dit eget valg regnet med */
export function tally(id: string, mine?: Stance) {
  const b = baseStances(id);
  const agree = b.agree + (mine === 'enig' ? 1 : 0);
  const disagree = b.disagree + (mine === 'uenig' ? 1 : 0);
  const total = agree + disagree;
  const pct = total ? Math.round((agree / total) * 100) : 50;
  return { agree, disagree, total, pct };
}
