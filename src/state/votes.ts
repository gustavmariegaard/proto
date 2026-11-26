import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Hjerter (synes godt om) på opslag, flicks og moments uden for Offentlig debat.
 * 1 = du synes godt om. Gamle nedstemmer fra før ignoreres.
 */

export type Vote = 1;

let votes: Record<string, Vote> = Object.fromEntries(
  Object.entries(keep<Record<string, number>>('votes', {})).filter(([, v]) => v === 1),
) as Record<string, Vote>;
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

/** Synes godt om. Igen fjerner det. */
export function vote(id: string, v: Vote) {
  const next = { ...votes };
  if (next[id] === v) delete next[id];
  else next[id] = v;
  votes = next;
  save('votes', next);
  listeners.forEach((l) => l());
}

