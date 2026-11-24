import { useSyncExternalStore } from 'react';
import { keep, save } from '../../state/keep';

/*
 * Ansøgning om at blive registreret som offentlig person.
 * Huskes i fanen. I prototypen vælger man selv udfaldet.
 */

export type Evidence = { link: string; file?: string };

export type PublicFigureStatus = 'ingen' | 'behandles' | 'godkendt' | 'afvist';

export type PublicFigureApplication = {
  status: PublicFigureStatus;
  category: string;
  evidence: Evidence[];
  sentAt?: string;
};

const KEY = 'offentlig-person';
const empty: PublicFigureApplication = {
  status: 'ingen',
  category: '',
  evidence: [{ link: '' }, { link: '' }, { link: '' }],
};

let state: PublicFigureApplication = keep(KEY, empty);
const listeners = new Set<() => void>();

function set(next: PublicFigureApplication) {
  state = next;
  save(KEY, state);
  listeners.forEach((l) => l());
}

export function usePublicFigure() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const publicFigure = {
  submit(category: string, evidence: Evidence[]) {
    const sentAt = new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long' });
    set({ status: 'behandles', category, evidence, sentAt });
  },
  decide(status: 'godkendt' | 'afvist') {
    set({ ...state, status });
  },
  /** Tilbage til formularen. Udfyldte felter beholdes. */
  edit() {
    set({ ...state, status: 'ingen' });
  },
  reset() {
    set(empty);
  },
};

export function isEvidenceDone(e: Evidence) {
  return e.link.trim().length > 0 || Boolean(e.file);
}
