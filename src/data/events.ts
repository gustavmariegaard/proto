import type { AvatarTone } from '../components/Avatar';
import { img } from './sample';

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
