import { useSyncExternalStore } from 'react';
import { contacts, initialThreads, type ChatMessage, type Thread } from '../../data/messages';

/*
 * Et lille lager til beskeder i hukommelsen.
 * Det lever, så længe appen er åben, så sendte beskeder er der stadig,
 * når man går tilbage til listen og ind igen. Intet sendes nogen steder hen.
 */

import { keep, save } from '../../state/keep';

let threads: Thread[] = keep('threads', initialThreads);
const listeners = new Set<() => void>();

function set(next: Thread[]) {
  threads = next;
  save('threads', next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getThreads = () => threads;

export function useThreads() {
  return useSyncExternalStore(subscribe, getThreads, getThreads);
}

export function useThread(id: string | undefined) {
  const all = useThreads();
  return all.find((t) => t.id === id);
}

/** Klokkeslæt som i Figma, fx "10.12" */
function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

function firstName(name: string) {
  return name.split(' ')[0]!;
}

export function markRead(id: string) {
  if (!threads.some((t) => t.id === id && t.unread)) return;
  set(threads.map((t) => (t.id === id ? { ...t, unread: false } : t)));
}

/** Sender en tekstbesked. Samtalen rykker op øverst i listen. */
export function sendMessage(id: string, text: string) {
  const thread = threads.find((t) => t.id === id);
  if (!thread) return;
  const message: ChatMessage = { id: `${id}-${Date.now()}`, from: 'me', kind: 'text', text };
  const updated: Thread = {
    ...thread,
    messages: [...thread.messages, message],
    preview: `Du: ${text}`,
    time: now(),
    unread: false,
  };
  set([updated, ...threads.filter((t) => t.id !== id)]);
}

/** Finder (eller opretter) samtalen med de valgte personer. Returnerer dens id. */
export function openConversation(contactIds: string[]): string {
  const picked = contacts.filter((c) => contactIds.includes(c.id));
  if (picked.length === 1) {
    const person = picked[0]!;
    const existing = threads.find((t) => t.kind === 'person' && t.contactId === person.id);
    if (existing) return existing.id;
    const thread: Thread = {
      id: person.id,
      kind: 'person',
      name: person.name,
      tone: person.tone,
      avatarSrc: person.avatarSrc,
      contactId: person.id,
      preview: '',
      time: now(),
      unread: false,
      messages: [],
    };
    set([thread, ...threads]);
    return thread.id;
  }
  return createCircle(picked.map((c) => firstName(c.name)).join(', '), contactIds, false);
}

/** Slår forsvindende beskeder til eller fra i en cirkel. */
export function setDisappearing(id: string, disappearing: boolean) {
  set(threads.map((t) => (t.id === id ? { ...t, disappearing } : t)));
}

/** Opretter en ny cirkel og returnerer dens id. */
export function createCircle(name: string, contactIds: string[], disappearing: boolean): string {
  const names = contacts.filter((c) => contactIds.includes(c.id)).map((c) => firstName(c.name));
  const thread: Thread = {
    id: `cirkel-${Date.now()}`,
    kind: 'circle',
    name,
    tone: 'sand',
    members: names.length ? `${names.join(', ')} og dig` : 'Kun dig',
    disappearing,
    preview: 'Cirklen er oprettet',
    time: now(),
    unread: false,
    messages: [],
  };
  set([thread, ...threads]);
  return thread.id;
}
