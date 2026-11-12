import { useSyncExternalStore } from 'react';
import { groups as initialGroups, pages as initialPages, type Community } from '../../data/more';

/*
 * Et lille lager i hukommelsen til grupper og sider, så en ny gruppe
 * eller side står øverst på listen, når man kommer tilbage.
 * Intet sendes nogen steder hen.
 */

function createStore(initial: Community[]) {
  let items = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const get = () => items;
  const set = (next: Community[]) => {
    items = next;
    listeners.forEach((l) => l());
  };
  return {
    use: () => useSyncExternalStore(subscribe, get, get),
    add: (item: Community) => set([item, ...items]),
    markRead: (id: string) => set(items.map((i) => (i.id === id ? { ...i, unread: false } : i))),
  };
}

export const groupStore = createStore(initialGroups);
export const pageStore = createStore(initialPages);

/** To bogstaver ud fra navnet, fx "Bogklubben" → "BO", "Byens bibliotek" → "BB". */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}
