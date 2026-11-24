import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Op- og nedstemmer i Offentlig debat (som på Reddit).
 * Hvert opslag har en score. Når scoren når HIDE_AT eller lavere,
 * forsvinder opslaget fra emnerne i Offentlig debat.
 */

/** Så lav må scoren være, før opslaget skjules af fællesskabet */
export const HIDE_AT = -5;

export type Vote = 1 | -1;

let votes: Record<string, Vote> = keep('votes', {});
const listeners = new Set<() => void>();
const get = () => votes;

export function useVotes() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    get,
    get,
  );
}

/** Stem op eller ned. Samme stemme igen fjerner den. */
export function vote(id: string, v: Vote) {
  const next = { ...votes };
  if (next[id] === v) delete next[id];
  else next[id] = v;
  votes = next;
  save('votes', next);
  listeners.forEach((l) => l());
}

/** Scoren med din egen stemme regnet med */
export const scoreWith = (base: number, mine?: Vote) => base + (mine ?? 0);

export const isBuried = (score: number) => score <= HIDE_AT;
