import type { AvatarTone } from '../components/Avatar';

/*
 * Eksempeldata til Beskeder. Tekster og billeder er hentet fra Figma
 * (billederne ligger i public/img/figma). Uden billede vises initialer.
 */

const img = (file: string) => `${import.meta.env.BASE_URL}img/figma/${file}`;

export type Contact = {
  id: string;
  name: string;
  tone: AvatarTone;
  /** Vises under navnet, fx "Du følger" eller "Torvet" */
  relation: string;
  /** Kun folk, du følger, kan føjes til en cirkel */
  friend: boolean;
  avatarSrc?: string;
};

export const contacts: Contact[] = [
  { id: 'mette', name: 'Mette Lund', tone: 'blue', relation: 'Du følger', friend: true, avatarSrc: img('mette.jpg') },
  { id: 'jonas', name: 'Jonas Krogh', tone: 'sage', relation: 'Du følger', friend: true, avatarSrc: img('jonas.jpg') },
  { id: 'karen', name: 'Karen Bech', tone: 'sand', relation: 'Torvet', friend: false, avatarSrc: img('person-b.jpg') },
  { id: 'soren', name: 'Søren Vang', tone: 'rose', relation: 'Du følger', friend: true, avatarSrc: img('person-c.jpg') },
  { id: 'pernille', name: 'Pernille Sørensen', tone: 'sand', relation: 'Du følger', friend: true, avatarSrc: img('person-f.jpg') },
];

/** "me" er den, der bruger appen. Ellers navnet på afsenderen. */
export type ChatMessage =
  | { id: string; from: string; kind: 'text'; text: string }
  | { id: string; from: string; kind: 'image'; src?: string }
  | { id: string; from: string; kind: 'voice'; duration: string };

export type Thread = {
  id: string;
  kind: 'person' | 'circle';
  name: string;
  tone: AvatarTone;
  avatarSrc?: string;
  /** Kontakten i en 1:1-samtale */
  contactId?: string;
  /** Under navnet i en cirkel, fx "Mor, Søren og dig" */
  members?: string;
  /** Beskeder forsvinder efter 24 timer */
  disappearing?: boolean;
  /** Teksten i listen, fx "Mor: Kommer I søndag klokken 12?" */
  preview: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
};

export const initialThreads: Thread[] = [
  {
    id: 'mette',
    kind: 'person',
    name: 'Mette Lund',
    tone: 'blue',
    avatarSrc: img('mette.jpg'),
    contactId: 'mette',
    preview: 'Har du set billederne fra i går?',
    time: '10.12',
    unread: true,
    messages: [
      { id: 'm1', from: 'Mette', kind: 'text', text: 'Har du set billederne fra i går?' },
      { id: 'm2', from: 'me', kind: 'text', text: 'Ja, de er gode. Jeg sender et par stykker.' },
      { id: 'm3', from: 'me', kind: 'image', src: img('familie-soe.jpg') },
      { id: 'm4', from: 'Mette', kind: 'voice', duration: '0:14' },
    ],
  },
  {
    id: 'familien',
    kind: 'circle',
    name: 'Familien',
    tone: 'rose',
    avatarSrc: img('familie-soe.jpg'),
    members: 'Mor, Søren og dig',
    disappearing: true,
    preview: 'Mor: Kommer I søndag klokken 12?',
    time: '10.12',
    unread: true,
    messages: [
      { id: 'f1', from: 'Mor', kind: 'text', text: 'Kommer I søndag klokken 12?' },
      { id: 'f2', from: 'me', kind: 'text', text: 'Ja, vi tager kage med.' },
      { id: 'f3', from: 'Søren', kind: 'text', text: 'Jeg henter bedstemor på vejen.' },
    ],
  },
  {
    id: 'jonas',
    kind: 'person',
    name: 'Jonas Krogh',
    tone: 'sage',
    avatarSrc: img('jonas.jpg'),
    contactId: 'jonas',
    preview: 'Vi ses torsdag i hallen',
    time: 'I går',
    unread: true,
    messages: [{ id: 'j1', from: 'Jonas', kind: 'text', text: 'Vi ses torsdag i hallen' }],
  },
  {
    id: 'haandboldholdet',
    kind: 'circle',
    name: 'Håndboldholdet',
    tone: 'sand',
    avatarSrc: img('haandbold.jpg'),
    members: 'Jonas, Anna og dig',
    preview: 'Jonas: Træning flyttet til torsdag',
    time: 'I går',
    unread: true,
    messages: [{ id: 'h1', from: 'Jonas', kind: 'text', text: 'Træning flyttet til torsdag' }],
  },
  {
    id: 'karen',
    kind: 'person',
    name: 'Karen Bech',
    tone: 'sand',
    avatarSrc: img('person-b.jpg'),
    contactId: 'karen',
    preview: 'Er spisebordet stadig til salg?',
    time: 'Man.',
    unread: false,
    messages: [{ id: 'k1', from: 'Karen', kind: 'text', text: 'Er spisebordet stadig til salg?' }],
  },
  {
    id: 'naboerne',
    kind: 'circle',
    name: 'Naboerne',
    tone: 'sage',
    avatarSrc: img('nyhavn.jpg'),
    members: 'Lise, Peter og dig',
    preview: 'Lise: Er der nogen, der har en stige?',
    time: 'Man.',
    unread: false,
    messages: [{ id: 'n1', from: 'Lise', kind: 'text', text: 'Er der nogen, der har en stige?' }],
  },
  {
    id: 'soren',
    kind: 'person',
    name: 'Søren Vang',
    tone: 'rose',
    avatarSrc: img('person-c.jpg'),
    contactId: 'soren',
    preview: 'Tak for sidst',
    time: 'Søn.',
    unread: false,
    messages: [{ id: 's1', from: 'Søren', kind: 'text', text: 'Tak for sidst' }],
  },
];
