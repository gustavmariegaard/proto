import { useSyncExternalStore } from 'react';
import { keep, save } from './keep';

/*
 * Fællesskabsnoter i Offentlig debat (inspireret af Community Notes på X).
 * Alle kan foreslå en note med kilde og vurdere andres: Ja, Lidt eller Nej
 * og hvorfor. En note vises på opslaget, når folk, der plejer at være
 * uenige, begge finder den hjælpsom. Ens egen note kan rettes eller slettes.
 */

export type Rating = 'ja' | 'lidt' | 'nej';
export type NoteStatus = 'vist' | 'forslag' | 'ikke';

export type Note = {
  id: string;
  postId: string;
  text: string;
  source?: string;
  status: NoteStatus;
  /** Antal vurderinger fra andre indtil videre */
  ratings: number;
  mine?: boolean;
};

export const statusLabel: Record<NoteStatus, string> = {
  vist: 'Vises på opslaget',
  forslag: 'Kræver flere vurderinger',
  ikke: 'Ikke vurderet hjælpsom',
};

/** Grunde, man kan vælge efter sin vurdering (som på X) */
export const reasons = {
  god: ['Gode kilder', 'Let at forstå', 'Svarer direkte på påstanden', 'Giver vigtig kontekst', 'Neutralt sprog'],
  daarlig: ['Mangler kilder', 'Mening eller gætværk', 'Usaglig eller partisk', 'Overser vigtige punkter', 'Opslaget behøver ingen note'],
};

const sample: Note[] = [
  {
    id: 'n-lars',
    postId: 'd-lars',
    text: 'Kommunens tællinger på Vestergade viser omkring 3.800 cyklister i døgnet i januar mod 5.200 i juni.',
    source: 'aarhus.dk/cykeltaelling',
    status: 'vist',
    ratings: 226,
  },
  {
    id: 'n-lars-2',
    postId: 'd-lars',
    text: 'Parkeringspladserne på Vestergade er i forvejen kun halvt fyldt om dagen.',
    source: 'aarhus.dk/parkering',
    status: 'forslag',
    ratings: 20,
  },
  {
    id: 'n-lars-3',
    postId: 'd-lars',
    text: 'Cykelstier er spild af penge, alle ved det.',
    status: 'ikke',
    ratings: 64,
  },
  {
    id: 'n-ahmed',
    postId: 'd-ahmed',
    text: 'Skolevalget handler om elevrådet, ikke om klassestørrelser eller timetal.',
    source: 'skolevalg.dk',
    status: 'forslag',
    ratings: 24,
  },
];

export type MyRating = { r: Rating; reasons: string[] };
type State = { notes: Note[]; ratings: Record<string, MyRating> };

let state: State = keep('notes2', { notes: sample, ratings: {} });
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
  save('notes2', next);
  listeners.forEach((l) => l());
}

export const useNotes = () => useSyncExternalStore(subscribe, get, get);

export const notesFor = (s: State, postId: string) => s.notes.filter((n) => n.postId === postId);
export const shownNote = (s: State, postId: string) => s.notes.find((n) => n.postId === postId && n.status === 'vist');

export function addNote(postId: string, text: string, source?: string) {
  const note: Note = { id: `n-${Date.now()}`, postId, text, source, status: 'forslag', ratings: 0, mine: true };
  set({ ...state, notes: [...state.notes, note] });
}

export function editNote(id: string, text: string, source?: string) {
  set({ ...state, notes: state.notes.map((n) => (n.id === id ? { ...n, text, source } : n)) });
}

export function deleteNote(id: string) {
  set({ ...state, notes: state.notes.filter((n) => n.id !== id) });
}

/** Vurder en note. Samme svar igen fjerner vurderingen. Nyt svar nulstiller grundene. */
export function rateNote(id: string, r: Rating) {
  const ratings = { ...state.ratings };
  if (ratings[id]?.r === r) delete ratings[id];
  else ratings[id] = { r, reasons: [] };
  set({ ...state, ratings });
}

export function toggleReason(id: string, reason: string) {
  const cur = state.ratings[id];
  if (!cur) return;
  const has = cur.reasons.includes(reason);
  const next = { ...cur, reasons: has ? cur.reasons.filter((x) => x !== reason) : [...cur.reasons, reason] };
  set({ ...state, ratings: { ...state.ratings, [id]: next } });
}
