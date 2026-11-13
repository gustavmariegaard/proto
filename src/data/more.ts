import type { AvatarTone } from '../components/Avatar';
import type { IconName } from '../components/Icon';
import { img, side } from './sample';

/*
 * Data til Mere-arket, Udvid cirkel (Find folk), Grupper og Sider.
 * Tekster er hentet fra Figma.
 */

/* ---------- Mere-arket ---------- */

export type MoreTile = { label: string; icon: IconName; to: string };

/** Genveje i Mere-arket, to pr. række, i samme rækkefølge som i Figma. */
export const moreTiles: MoreTile[] = [
  { label: 'Begivenheder', icon: 'calendar', to: '/begivenheder' },
  { label: 'Torvet', icon: 'shop', to: '/torvet' },
  { label: 'Grupper', icon: 'circles', to: '/grupper' },
  { label: 'Sider', icon: 'flag', to: '/sider' },
  { label: 'Gemt', icon: 'bookmark', to: '/gemt' },
  { label: 'Udvid cirkel', icon: 'user-plus', to: '/find-folk' },
  { label: 'Sprog, netværk og børn', icon: 'sliders', to: '/indstillinger' },
  { label: 'Privatliv og data', icon: 'lock', to: '/indstillinger' },
];

/* ---------- Udvid cirkel ---------- */

export type FolkPerson = { id: string; name: string; context: string; tone: AvatarTone; avatarSrc: string };

export const friendRequests: FolkPerson[] = [
  { id: 'louise', name: 'Louise Frandsen', context: 'Fælles cirkel: Naboerne', tone: 'rose', avatarSrc: img('person-d.jpg') },
  { id: 'mikkel', name: 'Mikkel Bech', context: 'Fælles gruppe: Håndboldholdet', tone: 'sage', avatarSrc: img('person-e.jpg') },
];

/** `sent` = anmodning allerede sendt (knappen viser "Sendt"). */
export const suggestions: (FolkPerson & { sent: boolean })[] = [
  { id: 'pernille', name: 'Pernille Sørensen', context: 'Fælles cirkel: Familien', tone: 'blue', avatarSrc: img('person-f.jpg'), sent: false },
  { id: 'anders', name: 'Anders Kjær', context: 'Fælles gruppe: Byparkens venner', tone: 'sand', avatarSrc: img('person-g.jpg'), sent: true },
  { id: 'naja', name: 'Naja Holst', context: 'Fælles cirkel: Naboerne', tone: 'sage', avatarSrc: img('person-h.jpg'), sent: false },
];

/* ---------- Grupper ---------- */

export type Community = {
  id: string;
  name: string;
  /** Initialer på avataren, som i Figma */
  initials: string;
  tone: AvatarTone;
  avatarSrc?: string;
  /** Fx "I går" eller "Ny aktivitet i dag" */
  meta: string;
  /** Mint prik: ny aktivitet */
  unread?: boolean;
};

export const groups: Community[] = [
  { id: 'haandbold', name: 'Håndboldholdet', initials: 'HB', tone: 'blue', avatarSrc: img('haandbold.jpg'), meta: 'Ny aktivitet i dag', unread: true },
  { id: 'vestergade', name: 'Naboer på Vestergade', initials: 'NV', tone: 'sage', meta: 'Nyt opslag for 2 t. siden', unread: true },
  { id: 'loeb', name: 'Løbeklubben', initials: 'LK', tone: 'rose', meta: 'I går' },
  { id: 'mad', name: 'Madklubben', initials: 'MK', tone: 'sand', meta: 'I går' },
  { id: 'foto', name: 'Fotografer i Aarhus', initials: 'FA', tone: 'blue', meta: 'Man.' },
  { id: 'foraeldre', name: 'Forældre i 3.b', initials: 'F3', tone: 'sage', meta: 'Man.' },
  { id: 'bog', name: 'Bogklubben', initials: 'BK', tone: 'rose', meta: 'Søn.' },
  { id: 'lokalhistorie', name: 'Lokalhistorie', initials: 'LH', tone: 'sand', meta: 'Søn.' },
];

/** Tallet i Figma ("30 grupper"). Listen viser kun de seneste. */
export const groupCount = 30;

export type GroupActivity = { id: string; group: string; initials: string; tone: AvatarTone; when: string; text: string };

export const groupActivity: GroupActivity[] = [
  { id: 'a1', group: 'Håndboldholdet', initials: 'HB', tone: 'blue', when: 'Du skrev for 2 t. siden', text: 'Jeg kan godt tage bolde med torsdag.' },
  { id: 'a2', group: 'Løbeklubben', initials: 'LK', tone: 'rose', when: 'Du skrev i går', text: 'Hvem løber lørdag klokken 9?' },
  { id: 'a3', group: 'Naboer på Vestergade', initials: 'NV', tone: 'sage', when: 'Du skrev man.', text: 'Er der nogen, der har en stige til låns?' },
  { id: 'a4', group: 'Bogklubben', initials: 'BK', tone: 'rose', when: 'Du skrev søn.', text: 'Næste bog bliver den korte. Stem her.' },
];

/* ---------- Sider ---------- */

export const pages: Community[] = [
  { id: 'kulturhuset', name: 'Kulturhuset', initials: 'KH', tone: 'blue', avatarSrc: img('dans.jpg'), meta: 'Nyt opslag i dag', unread: true },
  { id: 'hallen', name: 'Hallen', initials: 'HA', tone: 'rose', avatarSrc: side('hallen-logo.jpg'), meta: 'I går' },
  { id: 'bibliotek', name: 'Byens bibliotek', initials: 'BB', tone: 'sage', avatarSrc: side('bibliotek-logo.jpg'), meta: 'I går' },
  { id: 'bageri', name: 'Det lokale bageri', initials: 'DB', tone: 'sand', avatarSrc: side('bageri-logo.jpg'), meta: 'Man.' },
  { id: 'cykel', name: 'Cykelværkstedet', initials: 'CV', tone: 'blue', avatarSrc: side('vaerksted-logo.jpg'), meta: 'Man.' },
  { id: 'teater', name: 'Teaterforeningen', initials: 'TF', tone: 'sand', avatarSrc: side('teater-logo.jpg'), meta: 'Lør.' },
];

/** Tallet i Figma ("100 sider"). */
export const pageCount = 100;
