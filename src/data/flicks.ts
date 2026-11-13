import type { AvatarTone } from '../components/Avatar';

/*
 * Eksempeldata til Flicks. Tekster og fotos er hentet fra Figma
 * (public/img/figma). Uden foto vises en mørk/grå pladsholder.
 */

const img = (file: string) => `${import.meta.env.BASE_URL}img/figma/${file}`;

/** Hvilken fane flicken hører til: "Til dig" eller "Cirkel" */
export type FlickSource = 'tildig' | 'cirkel';

export type Flick = {
  id: string;
  source: FlickSource;
  /** Grøn linje øverst i tekstpanelet */
  reason: string;
  /** Venner, hvis små avatarer vises før grunden (Flicks 3) */
  friends?: { name: string; tone: AvatarTone; avatarSrc?: string }[];
  author: string;
  text: string;
  /** Sti til billede i public/img, ellers en pladsholder */
  image?: string;
  /** Pladsholderens farvetone (kun grå nuancer) */
  placeholder: 'dark' | 'light' | 'mid';
};

export const flicks: Flick[] = [
  {
    id: 'kulturhuset',
    source: 'tildig',
    reason: 'Fordi du følger Kultur',
    author: 'Kulturhuset',
    text: 'Syv minutter uden replikker, kun bevægelse.',
    image: img('dans.jpg'),
    placeholder: 'dark',
  },
  {
    id: 'byens-cyklister',
    source: 'tildig',
    reason: 'Fordi du følger Byudvikling',
    author: 'Byens Cyklister',
    text: 'Ny cykelrute langs åen åbner til foråret.',
    image: img('cykelsti.jpg'),
    placeholder: 'light',
  },
  {
    id: 'mette-rugbroed',
    source: 'cirkel',
    reason: 'Liket af Mette og Jonas',
    friends: [
      { name: 'Mette Lund', tone: 'blue', avatarSrc: img('mette.jpg') },
      { name: 'Jonas Krogh', tone: 'sage', avatarSrc: img('jonas.jpg') },
    ],
    author: 'Mette Lund',
    text: 'Søndagens rugblime, trin for trin.',
    image: img('mad.jpg'),
    placeholder: 'mid',
  },
];

/* ---------- Kommentarer (Flicks · Kommentarer) ---------- */

export type FlickComment = {
  id: string;
  author: string;
  tone: AvatarTone;
  time: string;
  text: string;
  likes: number;
  /** Svar, der vises under "Se 2 svar" */
  replies?: FlickComment[];
};

export const flickComments: FlickComment[] = [
  {
    id: 'fc1',
    author: 'Mette Lund',
    tone: 'blue',
    time: '1 t.',
    text: 'Så smukt. Hvor er det optaget?',
    likes: 12,
    /* Ekstra eksempelindhold (ikke fra Figma): de to svar bag "Se 2 svar" */
    replies: [
      { id: 'fc1r1', author: 'Kulturhuset', tone: 'sand', time: '45 min.', text: 'I den store sal i Kulturhuset.', likes: 3 },
      { id: 'fc1r2', author: 'Jonas Krogh', tone: 'sage', time: '30 min.', text: 'Jeg var der. Det var helt stille i salen.', likes: 1 },
    ],
  },
  { id: 'fc2', author: 'Jonas Krogh', tone: 'sage', time: '40 min.', text: 'Gåsehud hele vejen.', likes: 4 },
  { id: 'fc3', author: 'Anna Nørgaard', tone: 'rose', time: '22 min.', text: 'Kommer der flere fra Kulturhuset?', likes: 2 },
  { id: 'fc4', author: 'Peter Holm', tone: 'sand', time: '5 min.', text: 'Tak fordi I deler det her.', likes: 1 },
  { id: 'fc5', author: 'Karen Bech', tone: 'blue', time: 'Lige nu', text: 'Må man dele den videre?', likes: 0 },
];

/* ---------- Del (Flicks · Del) ---------- */

export type ShareTarget = { id: string; name: string; tone: AvatarTone; avatarSrc?: string };

export const shareTargets: ShareTarget[] = [
  { id: 'mette', name: 'Mette', tone: 'blue', avatarSrc: img('mette.jpg') },
  { id: 'jonas', name: 'Jonas', tone: 'sage', avatarSrc: img('jonas.jpg') },
  { id: 'familien', name: 'Familien', tone: 'rose', avatarSrc: img('familie-soe.jpg') },
];
