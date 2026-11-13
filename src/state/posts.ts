import { useSyncExternalStore } from 'react';
import { posts as samplePosts, type FeedPost } from '../data/sample';
import { keep, save } from './keep';

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
  return usePosts().find((p) => p.id === id);
}

export function addPost(post: Omit<FeedPost, 'id'>) {
  const next = { ...post, id: `mit-${Date.now()}` };
  mine = [next, ...mine];
  all = [next, ...all];
  save('posts', mine);
  listeners.forEach((l) => l());
}
