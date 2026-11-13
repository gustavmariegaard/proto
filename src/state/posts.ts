import { useSyncExternalStore } from 'react';
import { posts as samplePosts, type FeedPost } from '../data/sample';
import { keep, save } from './keep';
import { discoverPosts } from '../data/discover';

/*
 * Opslag i feedet. Nye opslag fra Opret lægges øverst.
 * Huskes i denne fane, ligesom beskeder.
 */

let mine: FeedPost[] = keep('posts', []);
let all: FeedPost[] = [...mine, ...samplePosts];
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const get = () => all;

export function usePosts() {
  return useSyncExternalStore(subscribe, get, get);
}

export function usePost(id: string | undefined) {
  // Også opslag fra Offentlig debat, så de kan åbnes, kommenteres og deles
  return usePosts().find((p) => p.id === id) ?? discoverPosts.find((p) => p.id === id);
}

export function addPost(post: Omit<FeedPost, 'id'>) {
  const next = { ...post, id: `mit-${Date.now()}` };
  mine = [next, ...mine];
  all = [next, ...all];
  save('posts', mine);
  listeners.forEach((l) => l());
}

/* ---------- "Ikke interesseret": skjulte opslag ---------- */
let hidden: string[] = keep('hidden', []);
const hiddenListeners = new Set<() => void>();
const getHidden = () => hidden;

export function useHidden(id: string) {
  const list = useSyncExternalStore(
    (l) => {
      hiddenListeners.add(l);
      return () => {
        hiddenListeners.delete(l);
      };
    },
    getHidden,
    getHidden,
  );
  return list.includes(id);
}

export function setHidden(id: string, on: boolean) {
  hidden = on ? [...hidden.filter((x) => x !== id), id] : hidden.filter((x) => x !== id);
  save('hidden', hidden);
  hiddenListeners.forEach((l) => l());
}
