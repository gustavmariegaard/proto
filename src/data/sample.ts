import type { AvatarTone } from '../components/Avatar';
import type { Post } from '../components/PostCard';

/*
 * Eksempeldata. Tekster er hentet fra Figma.
 * Billeder er grå pladsholdere. Læg egne billeder i public/img og
 * skriv stien her, fx image: '/img/aften.jpg' eller avatarSrc: '/img/mette.jpg'.
 */

export type Person = { name: string; fullName: string; tone: AvatarTone; avatarSrc?: string };

export const people: Record<string, Person> = {
  mette: { name: 'Mette', fullName: 'Mette Lund', tone: 'blue' },
  jonas: { name: 'Jonas', fullName: 'Jonas Krogh', tone: 'sage' },
  anna: { name: 'Anna', fullName: 'Anna Nørgaard', tone: 'sand' },
  peter: { name: 'Peter', fullName: 'Peter', tone: 'rose' },
};

/* ---------- Moments ---------- */

export type Moment = {
  id: string;
  personId: keyof typeof people;
  /** Fx "2 timer siden" */
  time: string;
  /** Sti til billede i public/img, ellers grå pladsholder */
  image?: string;
};

/** Hver persons moments i rækkefølge. Mette har fire (fire prikker i Figma). */
export const moments: Moment[] = [
  { id: 'm1', personId: 'mette', time: '2 timer siden' },
  { id: 'm2', personId: 'mette', time: '2 timer siden' },
  { id: 'm3', personId: 'mette', time: '2 timer siden' },
  { id: 'm4', personId: 'mette', time: '2 timer siden' },
  { id: 'j1', personId: 'jonas', time: '2 timer siden' },
  { id: 'a1', personId: 'anna', time: '2 timer siden' },
  { id: 'p1', personId: 'peter', time: '2 timer siden' },
];

/** Hvem der er set fra start (grå ring i Figma) */
export const initiallySeen = ['anna', 'peter'];

/* ---------- Opslag ---------- */

export type FeedPost = Post & { feed: 'venner' | 'interesser'; topic?: string };

export const posts: FeedPost[] = [
  {
    id: 'p-mette',
    feed: 'venner',
    author: 'Mette Lund',
    tone: 'blue',
    meta: 'Til Venner · for 2 timer siden',
    text: 'Sidste aften før vinteren sætter ind. Tak for en god sommer, alle sammen.',
    image: true,
  },
  {
    id: 'p-jonas',
    feed: 'venner',
    author: 'Jonas Krogh',
    tone: 'sage',
    meta: 'Til Håndboldholdet · i går',
    text: 'Træning flyttet til torsdag klokken 18. Hallen er booket, tag begge sæt tøj med.',
  },
  {
    id: 'p-kulturhuset',
    feed: 'interesser',
    topic: 'Kultur',
    author: 'Kulturhuset',
    tone: 'blue',
    meta: 'Kultur · Offentligt',
    text: 'Nye datoer for teater i byparken. Alle er velkomne, og det er gratis.',
  },
  {
    id: 'p-anna',
    feed: 'interesser',
    topic: 'Byudvikling',
    author: 'Anna Nørgaard',
    tone: 'rose',
    meta: 'Byudvikling · Offentligt',
    text: 'Kan vi blive enige om, at nye cykelstier skal måles på, hvor mange der faktisk bruger dem?',
  },
];

/* ---------- Kommentarer ---------- */

export type Comment = {
  id: string;
  author: string;
  tone: AvatarTone;
  time: string;
  text: string;
  likes: number;
  /** Svar vises rykket ind under kommentaren før */
  isReply?: boolean;
  isAuthor?: boolean;
  translatedFrom?: string;
};

/** Kommentarer fra Figma. Samme tråd vises på alle opslag i prototypen. */
export const comments: Comment[] = [
  { id: 'c1', author: 'Jonas Krogh', tone: 'sage', time: '2 t.', text: 'Det var en rigtig god sæson.', likes: 4 },
  {
    id: 'c2',
    author: 'Mette Lund',
    tone: 'blue',
    time: '1 t.',
    text: 'Tak, Jonas! Vi ses til foråret.',
    likes: 2,
    isReply: true,
    isAuthor: true,
  },
  { id: 'c3', author: 'Elin Andersson', tone: 'rose', time: '1 t.', text: 'Hvor fint!', likes: 0, translatedFrom: 'svensk' },
  { id: 'c4', author: 'Søren Vang', tone: 'sand', time: '40 min.', text: 'Skal vi mødes i weekenden?', likes: 1 },
];
