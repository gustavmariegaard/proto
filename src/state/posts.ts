import { useSyncExternalStore } from 'react';
import { posts as samplePosts, type FeedPost } from '../data/sample';
import { keep, save } from './keep';
import { discoverPosts } from '../data/discover';
import { flicks } from '../data/flicks';
import { moments, pageAccounts, people } from '../data/sample';

/** Et moment som opslag, så det kan deles og sendes videre som alt andet */
function momentAsPost(id: string | undefined): FeedPost | undefined {
  const m = moments.find((x) => x.id === id);
  if (!m) return undefined;
  const who = people[m.personId] ?? pageAccounts[m.personId];
  if (!who) return undefined;
  return { id: m.id, feed: 'venner', author: who.fullName, avatarSrc: who.avatarSrc, tone: who.tone, meta: 'Moment', text: `Moment · ${m.time}`, image: m.image };
}

/** En flick som opslag, så den kan deles, rapporteres og åbnes på samme måde */
function flickAsPost(id: string | undefined): FeedPost | undefined {
  const f = flicks.find((x) => x.id === id);
  if (!f) return undefined;
  const person = [...Object.values(people), ...Object.values(pageAccounts)].find((p) => p.fullName === f.author);
  return { id: f.id, feed: 'venner', author: f.author, avatarSrc: person?.avatarSrc, tone: person?.tone ?? 'sand', meta: 'Flick', text: f.text, image: f.image };
}

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
  return (
    usePosts().find((p) => p.id === id) ??
    discoverPosts.find((p) => p.id === id) ??
    flickAsPost(id) ??
    momentAsPost(id)
  );
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
