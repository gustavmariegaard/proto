import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Fællesskabsnoter i Offentlig debat (inspireret af Community Notes).
 * Alle kan foreslå en note med kilde. En note vises først på opslaget,
 * når folk, der plejer at være uenige, begge vurderer den hjælpsom.
 */

export type Rating = 'ja' | 'nej';

export type Note = {
  id: string;
  postId: string;
  text: string;
  source?: string;
  /** vist = står på opslaget, forslag = venter på vurderinger */
  status: 'vist' | 'forslag';
  /** Hjælpsom-vurderinger fra andre (din egen lægges til) */
  helpful: number;
  notHelpful: number;
  mine?: boolean;
};

const sample: Note[] = [
  {
    id: 'n-lars',
    postId: 'd-lars',
    text: 'Kommunens tællinger på Vestergade viser omkring 3.800 cyklister i døgnet i januar mod 5.200 i juni.',
    source: 'aarhus.dk/cykeltaelling',
    status: 'vist',
    helpful: 212,
    notHelpful: 14,
  },
  {
    id: 'n-lars-2',
    postId: 'd-lars',
    text: 'Parkeringspladserne på Vestergade er i forvejen kun halvt fyldt om dagen.',
    status: 'forslag',
    helpful: 9,
    notHelpful: 11,
  },
  {
    id: 'n-ahmed',
    postId: 'd-ahmed',
    text: 'Skolevalget handler om elevrådet, ikke om klassestørrelser eller timetal.',
    source: 'skolevalg.dk',
    status: 'forslag',
    helpful: 18,
    notHelpful: 6,
  },
];

type State = { notes: Note[]; ratings: Record<string, Rating> };

let state: State = keep('notes', { notes: sample, ratings: {} });
const listeners = new Set<() => void>();
const get = () => state;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function set(next: State) {
  state = next;
  save('notes', next);
  listeners.forEach((l) => l());
}

export const useNotes = () => useSyncExternalStore(subscribe, get, get);

export const notesFor = (s: State, postId: string) => s.notes.filter((n) => n.postId === postId);
export const shownNote = (s: State, postId: string) => s.notes.find((n) => n.postId === postId && n.status === 'vist');

export function addNote(postId: string, text: string, source?: string) {
  const note: Note = { id: `n-${Date.now()}`, postId, text, source, status: 'forslag', helpful: 0, notHelpful: 0, mine: true };
  set({ ...state, notes: [...state.notes, note] });
}

/** Vurder en note. Samme svar igen fjerner det. */
export function rateNote(id: string, r: Rating) {
  const ratings = { ...state.ratings };
  if (ratings[id] === r) delete ratings[id];
  else ratings[id] = r;
  set({ ...state, ratings });
}
