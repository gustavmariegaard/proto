import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Profiler, du har blokeret, og følgere, du har fjernet (efter brugernavn).
 * Huskes i denne fane.
 */
type Relations = { blocked: string[]; removedFollowers: string[] };

let state: Relations = keep('relations', { blocked: [], removedFollowers: [] });
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

export const block = (handle: string) =>
  set({ ...state, blocked: state.blocked.includes(handle) ? state.blocked : [...state.blocked, handle] });

export const unblock = (handle: string) => set({ ...state, blocked: state.blocked.filter((h) => h !== handle) });

export const removeFollower = (handle: string) =>
  set({
    ...state,
    removedFollowers: state.removedFollowers.includes(handle) ? state.removedFollowers : [...state.removedFollowers, handle],
  });
