import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Profiler, du har blokeret, følgere, du har fjernet, og afsendere,
 * du har skjult i Offentlig debat (efter brugernavn). Huskes i denne fane.
 *
 * Blokering: personen kan ikke se din profil eller skrive til dig – overalt.
 * Skjult i debatten: du ser bare ikke deres opslag i Offentlig debat.
 * De kan stadig se dig, og du ser dem stadig i dit eget feed.
 */
type Relations = { blocked: string[]; removedFollowers: string[]; mutedDebate: string[] };

const stored = keep<Partial<Relations>>('relations', {});
let state: Relations = { blocked: [], removedFollowers: [], mutedDebate: [], ...stored };
const listeners = new Set<() => void>();

function set(next: Relations) {
  state = next;
  save('relations', state);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const get = () => state;

export function useRelations() {
  return useSyncExternalStore(subscribe, get, get);
}

const add = (list: string[], h: string) => (list.includes(h) ? list : [...list, h]);

export const block = (handle: string) => set({ ...state, blocked: add(state.blocked, handle) });

export const unblock = (handle: string) => set({ ...state, blocked: state.blocked.filter((h) => h !== handle) });

export const removeFollower = (handle: string) => set({ ...state, removedFollowers: add(state.removedFollowers, handle) });

export const muteDebate = (handle: string) => set({ ...state, mutedDebate: add(state.mutedDebate, handle) });

export const unmuteDebate = (handle: string) => set({ ...state, mutedDebate: state.mutedDebate.filter((h) => h !== handle) });
