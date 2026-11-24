import type { AvatarTone } from '../components/Avatar';
import { img, side } from './sample';

/*
 * Begivenheder. Tekster til den første er hentet fra Figma
 * (Events, Begivenhed og RSVP-tilstandene).
 */

/** Din status for en begivenhed */
export type Rsvp = 'none' | 'interesseret' | 'deltager' | 'deltager-ikke';
export type Visibility = 'offentlig' | 'privat';

export type Guest = { id: string; name: string; tone: AvatarTone; avatarSrc?: string };

export type EventItem = {
  id: string;
  title: string;
  /** ISO-dato, fx "2026-11-14" */
  date: string;
  /** Fx "Kl. 17.00 til 19.00" */
  time: string;
  place: string;
  organizer: { name: string; initials?: string; tone: AvatarTone; avatarSrc?: string };
  visibility: Visibility;
  description: string;
  image: string;
  allowShare: boolean;
  rsvp: Rsvp;
  /** Om du står på listen over inviterede, indtil du har svaret */
  invitedMe: boolean;
  /** Du har selv oprettet begivenheden */
  createdByMe?: boolean;
  /** Antal tilmeldte i alt (offentlige begivenheder med mange gæster). Ellers tælles gæstelisten. */
  attendees?: number;
  guests: { going: Guest[]; notGoing: Guest[]; invited: Guest[] };
};

export const guestPeople: Record<string, Guest> = {
  mette: { id: 'mette', name: 'Mette', tone: 'blue', avatarSrc: img('mette.jpg') },
  jonas: { id: 'jonas', name: 'Jonas', tone: 'sage', avatarSrc: img('jonas.jpg') },
  karen: { id: 'karen', name: 'Karen', tone: 'sand', avatarSrc: img('person-b.jpg') },
  soeren: { id: 'soeren', name: 'Søren', tone: 'rose', avatarSrc: img('person-c.jpg') },
  pernille: { id: 'pernille', name: 'Pernille', tone: 'sand', avatarSrc: img('person-f.jpg') },
  anna: { id: 'anna', name: 'Anna', tone: 'sand', avatarSrc: img('anna.jpg') },
  peter: { id: 'peter', name: 'Peter', tone: 'rose', avatarSrc: img('peter.jpg') },
  sofie: { id: 'sofie', name: 'Sofie', tone: 'sand', avatarSrc: img('person-d.jpg') },
  ahmed: { id: 'ahmed', name: 'Ahmed', tone: 'blue', avatarSrc: img('person-e.jpg') },
};

const g = guestPeople;

/** ISO-dato for i dag + n dage (så eksemplerne altid ligger i den kommende tid) */
function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Næste lørdag (6) eller søndag (0) – i dag, hvis det er den dag */
function nextDay(weekday: number) {
  const today = new Date().getDay();
  return inDays((weekday - today + 7) % 7);
}

export function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const initialEvents: EventItem[] = [
  {
    id: 'fyraftensmoede',
    title: 'Fyraftensmøde i foreningen',
    date: '2026-11-14',
    time: 'Kl. 17.00 til 19.00',
    place: 'Forsamlingshuset',
    organizer: { name: 'Foreningen', initials: 'KH', tone: 'blue' },
    visibility: 'offentlig',
    description: 'Kom og hør om årets planer, og hjælp med at vælge dato for sommerfesten. Der er kaffe og kage.',
    image: img('begivenhed.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: true,
    guests: { going: [g.mette!, g.jonas!], notGoing: [g.karen!], invited: [g.soeren!, g.pernille!] },
  },
  {
    id: 'faellesspisning',
    title: 'Fællesspisning i opgangen',
    date: '2026-11-22',
    time: 'Kl. 18.00 til 21.00',
    place: 'Gårdhaven',
    organizer: { name: 'Anna Nørgaard', tone: 'sand', avatarSrc: img('anna.jpg') },
    visibility: 'privat',
    description: 'Alle i opgangen tager en ret med, og så spiser vi sammen i gården. Der er lune tæpper og varm kakao.',
    image: img('spisebord.jpg'),
    allowShare: false,
    rsvp: 'deltager',
    invitedMe: true,
    guests: { going: [g.anna!, g.peter!], notGoing: [], invited: [g.sofie!, g.karen!] },
  },
  {
    id: 'julemarked',
    title: 'Julemarked i byparken',
    date: '2026-12-06',
    time: 'Kl. 11.00 til 16.00',
    place: 'Byparken',
    organizer: { name: 'Byparkens venner', tone: 'sage' },
    visibility: 'offentlig',
    description: 'Boder med hjemmelavede gaver, gløgg og æbleskiver. Børnene kan møde julemanden kl. 13.',
    image: img('nyhavn.jpg'),
    allowShare: true,
    rsvp: 'interesseret',
    invitedMe: false,
    guests: { going: [g.sofie!, g.ahmed!, g.mette!], notGoing: [], invited: [] },
  },
  {
    id: 'julefrokost',
    title: 'Julefrokost i cirklen',
    date: '2026-12-19',
    time: 'Kl. 12.00 til 17.00',
    place: 'Hos Mette',
    organizer: { name: 'Mette Lund', tone: 'blue', avatarSrc: img('mette.jpg') },
    visibility: 'privat',
    description: 'Vi holder julefrokost hjemme hos Mette. Tag gerne en lille gave med til pakkespillet.',
    image: img('mad.jpg'),
    allowShare: false,
    rsvp: 'deltager-ikke',
    invitedMe: true,
    guests: { going: [g.mette!, g.jonas!], notGoing: [], invited: [g.soeren!] },
  },
  /* ---------- Offentlige begivenheder fra andre, som du ikke er inviteret til ---------- */
  {
    id: 'koncert-kulturhuset',
    title: 'Aftenkoncert i Kulturhuset',
    date: inDays(0),
    time: 'Kl. 20.00 til 22.30',
    place: 'Kulturhuset, salen',
    organizer: { name: 'Kulturhuset', tone: 'blue', avatarSrc: img('dans.jpg') },
    visibility: 'offentlig',
    description: 'Lokale bands spiller op til dans. Gratis adgang, og baren er åben hele aftenen.',
    image: img('dans.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: false,
    attendees: 34,
    guests: { going: [g.mette!, g.ahmed!, g.pernille!], notGoing: [], invited: [] },
  },
  {
    id: 'aaben-traening-hallen',
    title: 'Åben håndboldtræning for alle',
    date: inDays(2),
    time: 'Kl. 18.30 til 20.00',
    place: 'Hallen, bane 2',
    organizer: { name: 'Hallen', tone: 'rose', avatarSrc: side('hallen-logo.jpg') },
    visibility: 'offentlig',
    description: 'Prøv håndbold uden at være medlem. Alle niveauer er velkomne. Tag indesko og vand med.',
    image: side('hallen.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: false,
    attendees: 18,
    guests: { going: [g.jonas!, g.soeren!], notGoing: [], invited: [] },
  },
  {
    id: 'fortaelletime-bibliotek',
    title: 'Fortælletime for børn',
    date: nextDay(6),
    time: 'Kl. 10.30 til 11.30',
    place: 'Byens bibliotek, børneafdelingen',
    organizer: { name: 'Byens bibliotek', tone: 'sage', avatarSrc: side('bibliotek-logo.jpg') },
    visibility: 'offentlig',
    description: 'Vi læser julehistorier højt for børn fra 3 til 7 år. Bagefter er der saftevand og klippeklister.',
    image: side('bibliotek.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: false,
    attendees: 12,
    guests: { going: [g.anna!, g.sofie!], notGoing: [], invited: [] },
  },
  {
    id: 'soendagstur-cykel',
    title: 'Søndagstur rundt om søen',
    date: nextDay(0),
    time: 'Kl. 9.30 til 12.00',
    place: 'Mødested ved søens bådebro',
    organizer: { name: 'Cykelklubben Øst', initials: 'CØ', tone: 'sage' },
    visibility: 'offentlig',
    description: 'En rolig tur på 30 km i fælles tempo. Vi holder kaffepause halvvejs. Husk hjelm.',
    image: img('cykelsti.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: false,
    attendees: 9,
    guests: { going: [g.peter!, g.ahmed!], notGoing: [], invited: [] },
  },
  {
    id: 'loppemarked-sofie',
    title: 'Loppemarked i gården',
    date: inDays(8),
    time: 'Kl. 10.00 til 14.00',
    place: 'Gården i Nørregade 12',
    organizer: { name: 'Sofie Holm', tone: 'sand', avatarSrc: img('person-d.jpg') },
    visibility: 'offentlig',
    description: 'Jeg rydder ud i tøj og legetøj. Naboerne er velkomne til at sætte en bod op ved siden af.',
    image: img('toej.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: false,
    attendees: 6,
    guests: { going: [g.karen!], notGoing: [], invited: [] },
  },
  {
    id: 'juleforestilling-teater',
    title: 'Juleforestilling: Nissernes nat',
    date: inDays(11),
    time: 'Kl. 16.00 til 17.30',
    place: 'Teatersalen på skolen',
    organizer: { name: 'Teaterforeningen', tone: 'sand', avatarSrc: side('teater-logo.jpg') },
    visibility: 'offentlig',
    description: 'Foreningens amatørskuespillere opfører en juleforestilling for hele familien. Fri entré.',
    image: side('teater.jpg'),
    allowShare: true,
    rsvp: 'none',
    invitedMe: false,
    attendees: 47,
    guests: { going: [g.mette!, g.karen!, g.anna!], notGoing: [], invited: [] },
  },
];

/** Grupper, man kan invitere til en privat begivenhed (Ny begivenhed · Privat) */
export const inviteGroups: { id: string; label: string; members: Guest[] }[] = [
  { id: 'familien', label: 'Familien', members: [g.anna!, g.peter!] },
  { id: 'naboerne', label: 'Naboerne', members: [g.karen!, g.sofie!] },
  { id: 'haandbold', label: 'Håndboldholdet', members: [g.jonas!, g.ahmed!] },
  { id: 'venner', label: '+ Følgere', members: [g.mette!, g.soeren!, g.pernille!] },
];

export const rsvpLabel: Record<Exclude<Rsvp, 'none'>, string> = {
  interesseret: 'Interesseret',
  deltager: 'Deltager',
  'deltager-ikke': 'Deltager ikke',
};

const weekdays = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Hører begivenheden til under "Dine"? Inviteret, svaret eller oprettet af dig. */
export function isMine(e: EventItem) {
  return e.invitedMe || e.rsvp !== 'none' || !!e.createdByMe;
}

/** Offentlige begivenheder, du ikke er en del af endnu (Find begivenheder). Private vises aldrig her. */
export function isDiscoverable(e: EventItem, todayIso: string) {
  return e.visibility === 'offentlig' && !isMine(e) && e.date >= todayIso;
}

/** Antal tilmeldte, med dig, hvis du deltager */
export function attendeeCount(e: EventItem) {
  const base = e.attendees ?? e.guests.going.length;
  return base + (e.rsvp === 'deltager' ? 1 : 0);
}

/** Kort dato, fx "Lør 28. nov." */
export function shortDate(iso: string) {
  const d = parse(iso);
  return `${weekdays[d.getDay()]!.slice(0, 3)} ${d.getDate()}. ${months[d.getMonth()]!.slice(0, 3)}.`;
}

/** "14" og "NOV" til datomærket på kortet */
export function dateBadge(iso: string) {
  const d = parse(iso);
  return { day: String(d.getDate()).padStart(2, '0'), month: months[d.getMonth()]!.slice(0, 3).toUpperCase() };
}

/** Fx "Lørdag 14. november" */
export function longDate(iso: string) {
  const d = parse(iso);
  return `${weekdays[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}
