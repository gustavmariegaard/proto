import { useSyncExternalStore } from 'react';
import { initialCollections, photoById, type Collection, type Photo } from '../../data/profile';

/*
 * Samlinger på profilen. Lille lager uden provider, så ændringer fra
 * "Rediger samling" ses på profilen og i samlingen. Kun i hukommelsen.
 */

let collections: Collection[] = initialCollections;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCollections() {
  return useSyncExternalStore(subscribe, () => collections);
}

export function useCollection(id: string) {
  const all = useCollections();
  return all.find((c) => c.id === id);
}

export function updateCollection(id: string, patch: Partial<Omit<Collection, 'id'>>) {
  collections = collections.map((c) => (c.id === id ? { ...c, ...patch } : c));
  listeners.forEach((cb) => cb());
}

/** Billederne i en samling, forsiden først ikke flyttet (rækkefølgen bevares). */
export function collectionPhotos(c: Collection): Photo[] {
  return c.photoIds.map(photoById).filter((p): p is Photo => Boolean(p));
}

/** Fordeler elementer i to kolonner som i Figmas masonry (skiftevis venstre/højre). */
export function twoColumns<T>(items: T[]): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, i) => (i % 2 === 0 ? left : right).push(item));
  return [left, right];
}
