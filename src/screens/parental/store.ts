import { useSyncExternalStore } from 'react';
import type { AvatarTone } from '../../components/Avatar';
import { keep, save } from '../../state/keep';

/*
 * Forældrekontrol: tilknyttede børn og hvad de må.
 * Eksempeldata til prototypen (ikke fra Figma). Huskes i fanen.
 */

export type Contact = 'godkendte' | 'foelger' | 'alle';

export type ChildSettings = {
  /** Hvilke dele af appen barnet må bruge */
  areas: Record<string, boolean>;
  sensitive: boolean;
  blockedTopics: string[];
  contact: Contact;
  approveFollowers: boolean;
  screenTime: string;
  bedtime: boolean;
};

export type Child = {
  id: string;
  name: string;
  age: number;
  handle?: string;
  tone: AvatarTone;
  settings: ChildSettings;
};

/** Børn, MitID finder via CPR (dine børn under 18) */
export const mitidChildren: { id: string; name: string; age: number; handle?: string; tone: AvatarTone }[] = [
  { id: 'emil', name: 'Emil', age: 13, handle: 'emil.lund', tone: 'blue' },
  { id: 'ida', name: 'Ida', age: 9, tone: 'sage' },
];

/** Dele af appen, man kan slå til og fra */
export const areas = [
  { id: 'moments', title: 'Moments', hint: 'Se og dele moments, der forsvinder efter 24 timer.' },
  { id: 'flicks', title: 'Flicks', hint: 'Korte videoer. Kun fra folk og sider, barnet følger.' },
  { id: 'debat', title: 'Offentlig debat', hint: 'Opslag om emner fra personer, barnet ikke kender.' },
  { id: 'sider', title: 'Sider og interesser', hint: 'Nyt fra sider som Kulturhuset og Hallen.' },
  { id: 'grupper', title: 'Grupper', hint: 'Fx sportsklubben eller klassens gruppe.' },
  { id: 'torvet', title: 'Torvet', hint: 'Køb og salg mellem brugere.' },
  { id: 'begivenheder', title: 'Begivenheder', hint: 'Se og tilmelde sig begivenheder.' },
];

/** Udgangspunkt efter alder: jo yngre, jo mere lukket */
export function defaultsFor(age: number): ChildSettings {
  const young = age < 13;
  return {
    areas: {
      moments: !young,
      flicks: !young,
      debat: false,
      sider: true,
      grupper: true,
      torvet: false,
      begivenheder: true,
    },
    sensitive: true,
    blockedTopics: ['Politik'],
    contact: young ? 'godkendte' : 'foelger',
    approveFollowers: true,
    screenTime: young ? '30 min.' : '60 min.',
    bedtime: true,
  };
}

let children: Child[] = keep('children', []);
const listeners = new Set<() => void>();
const get = () => children;

function set(next: Child[]) {
  children = next;
  save('children', next);
  listeners.forEach((l) => l());
}

export function useChildren() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    get,
    get,
  );
}

export function addChild(c: Omit<Child, 'settings'>) {
  if (children.some((x) => x.id === c.id)) return;
  set([...children, { ...c, settings: defaultsFor(c.age) }]);
}

export function removeChild(id: string) {
  set(children.filter((c) => c.id !== id));
}

export function updateChild(id: string, patch: Partial<ChildSettings>) {
  set(children.map((c) => (c.id === id ? { ...c, settings: { ...c.settings, ...patch } } : c)));
}

export function setChildHandle(id: string, handle: string) {
  set(children.map((c) => (c.id === id ? { ...c, handle } : c)));
}
