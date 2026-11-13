import type { AvatarTone } from '../components/Avatar';
import { img, posts } from './sample';

/*
 * Eksempeldata til Søg, Notifikationer, Gemt, Skaber og Indstillinger.
 * Tekster er hentet fra Figma. Rækker markeret "ikke fra Figma" er
 * ekstra indhold, så søgningen har noget at finde.
 */

/* ---------- Søg ---------- */

export type SearchPerson = {
  id: string;
  name: string;
  /** Under navnet, fx "Du følger" eller "Fælles gruppe: Håndboldholdet" */
  relation: string;
  tone: AvatarTone;
  avatarSrc?: string;
  /** Hvor rækken fører hen */
  to: string;
  /** Vises, før man har skrevet noget (de tre fra Figma) */
  suggested?: boolean;
};

export const searchPeople: SearchPerson[] = [
  { id: 'mette', name: 'Mette Lund', relation: 'Du følger', tone: 'blue', avatarSrc: img('mette.jpg'), to: '/beskeder/mette', suggested: true },
  {
    id: 'mikkel',
    name: 'Mikkel Bech',
    relation: 'Fælles gruppe: Håndboldholdet',
    tone: 'sage',
    to: '/find-folk',
    suggested: true,
  },
  {
    id: 'pernille',
    name: 'Pernille Sørensen',
    relation: 'Fælles cirkel: Familien',
    tone: 'sand',
    avatarSrc: img('person-f.jpg'),
    to: '/find-folk',
    suggested: true,
  },
  /* ---------- ikke fra Figma ---------- */
  { id: 'jonas', name: 'Jonas Krogh', relation: 'Du følger', tone: 'sage', avatarSrc: img('jonas.jpg'), to: '/beskeder/jonas' },
  { id: 'anna', name: 'Anna Nørgaard', relation: 'Du følger', tone: 'rose', avatarSrc: img('anna.jpg'), to: '/find-folk' },
  { id: 'peter', name: 'Peter Holm', relation: 'Du følger', tone: 'rose', avatarSrc: img('peter.jpg'), to: '/find-folk' },
  { id: 'soren', name: 'Søren Vang', relation: 'Du følger', tone: 'sand', avatarSrc: img('person-c.jpg'), to: '/beskeder/soren' },
  { id: 'karen', name: 'Karen Bech', relation: 'Fælles gruppe: Naboerne', tone: 'sage', avatarSrc: img('person-b.jpg'), to: '/beskeder/karen' },
  { id: 'louise', name: 'Louise Frandsen', relation: 'Vil følge dig', tone: 'rose', to: '/notifikationer' },
];

export type SearchPlace = {
  id: string;
  name: string;
  /** Under navnet, fx "Gruppe · 24 medlemmer" */
  meta: string;
  tone: AvatarTone;
  avatarSrc?: string;
  to: string;
};

/** Grupper (ikke fra Figma) */
export const searchGroups: SearchPlace[] = [
  { id: 'haandbold', name: 'Håndboldholdet', meta: 'Gruppe · 18 medlemmer', tone: 'sage', avatarSrc: img('haandbold.jpg'), to: '/grupper' },
  { id: 'naboerne', name: 'Naboerne', meta: 'Gruppe · 32 medlemmer', tone: 'blue', avatarSrc: img('nyhavn.jpg'), to: '/grupper' },
  { id: 'cykel', name: 'Cykelklubben Øst', meta: 'Gruppe · 140 medlemmer', tone: 'sage', avatarSrc: img('cykelsti.jpg'), to: '/grupper' },
  { id: 'loeb', name: 'Løbefællesskabet', meta: 'Gruppe · 86 medlemmer', tone: 'sand', avatarSrc: img('person-h.jpg'), to: '/grupper' },
  { id: 'have', name: 'Haveglade i byen', meta: 'Gruppe · 57 medlemmer', tone: 'sage', avatarSrc: img('have.jpg'), to: '/grupper' },
];

/** Sider (ikke fra Figma) */
export const searchPages: SearchPlace[] = [
  { id: 'kulturhuset', name: 'Kulturhuset', meta: 'Side · Kultur', tone: 'blue', avatarSrc: img('dans.jpg'), to: '/sider' },
  { id: 'bibliotek', name: 'Byens Bibliotek', meta: 'Side · Kultur', tone: 'blue', avatarSrc: img('nyhavn.jpg'), to: '/sider' },
  { id: 'lyden', name: 'Spillestedet Lyden', meta: 'Side · Musik', tone: 'sand', avatarSrc: img('begivenhed.jpg'), to: '/sider' },
  { id: 'groenne', name: 'Grønne Gader', meta: 'Side · Byudvikling', tone: 'sage', avatarSrc: img('have.jpg'), to: '/sider' },
];

/** Opslag, der kan søges i (fra sample.ts) */
export const searchPosts = posts;

export const initialRecentSearches = ['Håndbold', 'Cykelrute', 'Mette Lund'];

/* ---------- Notifikationer ---------- */

export type Notification = {
  id: string;
  text: string;
  time: string;
  tone: AvatarTone;
  avatarSrc?: string;
  /** "Nye" eller "Tidligere" */
  group: 'nye' | 'tidligere';
  unread: boolean;
  /** Anmodning om at følge dig, med Accepter / Afvis / Ignorer */
  friendRequest?: { name: string };
  /** Hvor rækken fører hen */
  to?: string;
};

export const initialNotifications: Notification[] = [
  {
    id: 'n-louise',
    text: 'Louise Frandsen vil gerne følge dig.',
    time: 'Lige nu',
    tone: 'rose',
    group: 'nye',
    unread: true,
    friendRequest: { name: 'Louise Frandsen' },
  },
  {
    id: 'n-mette',
    text: 'Mette Lund kommenterede dit opslag.',
    time: '1 time',
    tone: 'blue',
    avatarSrc: img('mette.jpg'),
    group: 'nye',
    unread: true,
    to: '/opslag/p-mette',
  },
  {
    id: 'n-anna',
    text: 'Anna Nørgaard svarede på din kommentar.',
    time: '2 timer',
    tone: 'rose',
    avatarSrc: img('anna.jpg'),
    group: 'tidligere',
    unread: false,
    to: '/opslag/p-anna',
  },
  {
    id: 'n-naboerne',
    text: 'Naboerne har en ny begivenhed: Fællesspisning i opgangen.',
    time: 'I går',
    tone: 'sage',
    avatarSrc: img('nyhavn.jpg'),
    group: 'tidligere',
    unread: false,
    to: '/begivenheder',
  },
  {
    id: 'n-soeren',
    text: 'Søren Vang inviterede dig til Julemarked i byparken.',
    time: 'I går',
    tone: 'sand',
    avatarSrc: img('person-c.jpg'),
    group: 'tidligere',
    unread: false,
    to: '/begivenheder',
  },
];

/* ---------- Gemt ---------- */

export type SavedItem = {
  id: string;
  kind: 'opslag' | 'flick';
  /** Højde i masonry-gitteret, som i Figma */
  height: number;
  image: string;
  /** Kort beskrivelse til skærmlæsere */
  label: string;
  to: string;
};

/** Rækkefølge: venstre, højre, venstre, højre … Højderne er fra Figma. */
export const savedItems: SavedItem[] = [
  { id: 's1', kind: 'opslag', height: 190, image: img('aften.jpg'), label: 'Opslag fra Mette Lund', to: '/opslag/p-mette' },
  { id: 's2', kind: 'flick', height: 120, image: img('dans.jpg'), label: 'Flick', to: '/flicks' },
  { id: 's3', kind: 'opslag', height: 120, image: img('mad.jpg'), label: 'Opslag fra Sofie Holm', to: '/opslag/p-sofie' },
  { id: 's4', kind: 'flick', height: 200, image: img('cykelsti.jpg'), label: 'Flick', to: '/flicks' },
  { id: 's5', kind: 'opslag', height: 170, image: img('haandbold.jpg'), label: 'Opslag fra Jonas Krogh', to: '/opslag/p-jonas-2' },
  { id: 's6', kind: 'opslag', height: 130, image: img('have.jpg'), label: 'Opslag fra Grønne Gader', to: '/opslag/p-byudvikling-2' },
];

/* ---------- Skaber og virksomhed ---------- */

export type ProfileType = 'privat' | 'skaber' | 'virksomhed';

export const profileTypes: { value: ProfileType; label: string }[] = [
  { value: 'privat', label: 'Privat' },
  { value: 'skaber', label: 'Skaber' },
  { value: 'virksomhed', label: 'Virksomhed' },
];

/** Teksten under valget. Kun "Skaber" er fra Figma. */
export const profileTypeHints: Record<ProfileType, string> = {
  privat: 'Din profil er kun for dem, du selv vælger.',
  skaber: 'Tag imod drikkepenge og abonnementer fra dem, der følger dig.',
  virksomhed: 'Sælg på Torvet og annoncér for folk i hele EU.',
};

export const creatorToggles = [
  { id: 'tips', title: 'Tag imod drikkepenge', hint: 'Følgere kan støtte dine opslag og Flicks.' },
  { id: 'abonnement', title: 'Abonnement for følgere', hint: 'Pris: [DIN PRIS] kr. om måneden.' },
  { id: 'butik', title: 'Butik på Torvet', hint: 'Sælg varer med sikker betaling i appen.' },
  { id: 'annoncer', title: 'Annoncer ved mine Flicks', hint: 'Kun virksomheder i EU kan annoncere. Du kan se, hvorfor en annonce vises.' },
];

export const creatorToggleDefaults: Record<string, boolean> = { tips: true, abonnement: false, butik: false, annoncer: true };

/* ---------- Indstillinger ---------- */

export const languages = ['Dansk', 'English', 'Deutsch', 'Français', 'Español'];

export const translationToggles = [
  { id: 'oversaet-opslag', title: 'Oversæt opslag automatisk', hint: 'Fremmedsprogede opslag vises på dit sprog.' },
  { id: 'oversaet-beskeder', title: 'Oversæt beskeder', hint: 'Du kan altid se den originale tekst.' },
];

export const networkToggles = [
  { id: 'foelg-andre', title: 'Følg folk på andre netværk', hint: 'Fx Mastodon og Bluesky vises i dit feed.' },
  { id: 'del-offentlige', title: 'Del mine offentlige opslag', hint: 'Andre netværk kan følge dine offentlige opslag.' },
];

export const familyToggles = [
  { id: 'boernetilstand', title: 'Børnetilstand', hint: 'Kun godkendte kontakter og indhold, der passer til alderen.' },
  { id: 'foraeldrekontrol', title: 'Forældrekontrol', hint: 'Beskyttet med kode. Forældre godkender nye kontakter.' },
];

export const settingsToggleDefaults: Record<string, boolean> = {
  'oversaet-opslag': true,
  'oversaet-beskeder': true,
  'foelg-andre': true,
  'del-offentlige': false,
  boernetilstand: false,
  foraeldrekontrol: false,
};

export const screenTimeOptions = ['30 min.', '60 min.', '90 min.', 'Ingen grænse'];

/** Eksemplet på oversættelse i Indstillinger */
export const translationExample = {
  name: 'Elin Andersson',
  language: 'Svensk',
  avatarSrc: img('person-i.jpg'),
  translated: 'Sikke en fin udsigt, vi havde i går aftes.',
  original: 'Vilken fin utsikt vi hade i går kväll.',
};
