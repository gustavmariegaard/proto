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
  sofie: { name: 'Sofie', fullName: 'Sofie Holm', tone: 'sand' },
  ahmed: { name: 'Ahmed', fullName: 'Ahmed Rahimi', tone: 'blue' },
  karen: { name: 'Karen', fullName: 'Karen Bech', tone: 'sage' },
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
  { id: 's1', personId: 'sofie', time: '3 timer siden' },
  { id: 's2', personId: 'sofie', time: '3 timer siden' },
  { id: 'h1', personId: 'ahmed', time: '5 timer siden' },
  { id: 'k1', personId: 'karen', time: 'i går' },
];

/** Hvem der er set fra start (grå ring i Figma) */
export const initiallySeen = ['anna', 'peter', 'karen'];

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
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  {
    id: 'p-sofie',
    feed: 'venner',
    author: 'Sofie Holm',
    tone: 'sand',
    meta: 'Til Familien · for 3 timer siden',
    text: 'Første forsøg med surdejsbrød. Det blev fladt, men det smager fantastisk. Næste gang skal det nok hæve.',
    image: true,
  },
  {
    id: 'p-ahmed',
    feed: 'venner',
    author: 'Ahmed Rahimi',
    tone: 'blue',
    meta: 'Til Venner · for 5 timer siden',
    text: 'Er der nogen, der har en trailer, jeg kan låne på lørdag? Vi flytter endelig ind i den nye lejlighed.',
  },
  {
    id: 'p-mette-2',
    feed: 'venner',
    author: 'Mette Lund',
    tone: 'blue',
    meta: 'Til Venner · i går',
    text: 'Morgentur ved vandet inden arbejde. Det er koldt nu, men lyset er helt særligt.',
    image: true,
  },
  {
    id: 'p-karen',
    feed: 'venner',
    author: 'Karen Bech',
    tone: 'sage',
    meta: 'Til Naboerne · i går',
    text: 'Fællesspisning i gården på søndag klokken 17. Tag noget med til buffeten, så sørger vi for borde og stole.',
  },
  {
    id: 'p-peter',
    feed: 'venner',
    author: 'Peter',
    tone: 'rose',
    meta: 'Til Venner · for 2 dage siden',
    text: 'Tak for i lørdags, alle sammen. Det var den bedste fødselsdag i mange år.',
    image: true,
  },
  {
    id: 'p-jonas-2',
    feed: 'venner',
    author: 'Jonas Krogh',
    tone: 'sage',
    meta: 'Til Håndboldholdet · for 3 dage siden',
    text: 'Godt kæmpet i weekenden. Vi tabte med to mål, men forsvaret har aldrig set bedre ud.',
  },
  {
    id: 'p-anna-2',
    feed: 'venner',
    author: 'Anna Nørgaard',
    tone: 'rose',
    meta: 'Til Venner · for 4 dage siden',
    text: 'Nogen der vil med på loppemarked i Kødbyen på søndag? Jeg leder efter en gammel reol.',
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
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  {
    id: 'p-musik',
    feed: 'interesser',
    topic: 'Musik',
    author: 'Spillestedet Lyden',
    tone: 'sand',
    meta: 'Musik · Offentligt',
    text: 'Åben scene hver torsdag i november. Skriv dig på listen i baren, og tag dit eget instrument med.',
    image: true,
  },
  {
    id: 'p-cykling',
    feed: 'interesser',
    topic: 'Cykling',
    author: 'Cykelklubben Øst',
    tone: 'sage',
    meta: 'Cykling · Offentligt',
    text: 'Vinterturen kører fra havnen lørdag klokken 9. Vi holder et roligt tempo, og alle kan være med.',
  },
  {
    id: 'p-madlavning',
    feed: 'interesser',
    topic: 'Madlavning',
    author: 'Lene Dahl',
    tone: 'rose',
    meta: 'Madlavning · Offentligt',
    text: 'Min bedste opskrift på græskarsuppe: ristet græskar, ingefær og en sjat kokosmælk. Så enkelt er det.',
    image: true,
  },
  {
    id: 'p-kultur-2',
    feed: 'interesser',
    topic: 'Kultur',
    author: 'Byens Bibliotek',
    tone: 'blue',
    meta: 'Kultur · Offentligt',
    text: 'Forfatteraften på tirsdag. Kom og hør, hvordan en roman bliver til, fra første idé til færdig bog.',
  },
  {
    id: 'p-byudvikling-2',
    feed: 'interesser',
    topic: 'Byudvikling',
    author: 'Grønne Gader',
    tone: 'sage',
    meta: 'Byudvikling · Offentligt',
    text: 'Vi har plantet 40 nye træer i kvarteret i år. Hvor skal de næste stå? Skriv dit forslag i kommentarerne.',
    image: true,
  },
  {
    id: 'p-fotografi',
    feed: 'interesser',
    topic: 'Fotografi',
    author: 'Mikkel Aagaard',
    tone: 'sand',
    meta: 'Fotografi · Offentligt',
    text: 'Tip til mørke aftener: Sæt kameraet på noget fast, og brug selvudløseren. Så bliver billedet skarpt.',
    image: true,
  },
  {
    id: 'p-loeb',
    feed: 'interesser',
    topic: 'Løb',
    author: 'Løbefællesskabet',
    tone: 'blue',
    meta: 'Løb · Offentligt',
    text: 'Nyt begynderhold starter i januar. Fra sofa til fem kilometer på otte uger, i dit eget tempo.',
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
