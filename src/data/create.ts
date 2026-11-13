import type { AvatarTone } from '../components/Avatar';

/*
 * Data til Opret, Del og Rapportér. Tekster er hentet fra Figma.
 */

/* ---------- Opret ---------- */

export type CreateKind = 'opslag' | 'flick' | 'moment';
export const createKinds: { value: CreateKind; label: string }[] = [
  { value: 'opslag', label: 'Opslag' },
  { value: 'flick', label: 'Flick' },
  { value: 'moment', label: 'Moment' },
];

/** Man kan dele med venner, offentligt eller i en af sine grupper */
export type Audience = 'venner' | 'offentlig' | 'gruppe';
export const audiences: { value: Audience; label: string; hint: string }[] = [
  { value: 'venner', label: 'Venner', hint: 'Dine venner kan se opslaget.' },
  // Ikke i Figma: forklaringerne til "Offentligt" og "Gruppe" er skrevet i samme tone.
  { value: 'offentlig', label: 'Offentligt', hint: 'Alle kan se opslaget.' },
  { value: 'gruppe', label: 'Gruppe', hint: 'Vælg den gruppe, opslaget skal deles i.' },
];

export type PhotoFormat = 'kvadrat' | 'portraet' | 'landskab';
export const photoFormats: { value: PhotoFormat; label: string }[] = [
  { value: 'kvadrat', label: 'Kvadrat' },
  { value: 'portraet', label: 'Portræt' },
  { value: 'landskab', label: 'Landskab' },
];

export type SettingRow = { id: string; title: string; hint: string; on: boolean };

/** Flere indstillinger (tekstopslag) */
export const postSettings: SettingRow[] = [
  { id: 'kommentarer', title: 'Tillad kommentarer', hint: 'Dine venner kan svare på opslaget.', on: true },
  { id: 'deling', title: 'Tillad deling videre', hint: 'Andre kan dele opslaget til deres egen profil.', on: false },
  { id: 'likes', title: 'Skjul antal synes godt om', hint: 'Andre kan ikke se, hvor mange der har likket opslaget.', on: false },
];

/** Indstillinger for et billede */
export const photoSettings: SettingRow[] = [
  { id: 'fastgoer', title: 'Fastgør øverst på profilen', hint: 'Vises over dine øvrige opslag.', on: false },
  { id: 'gitter', title: 'Vis i gitteret', hint: 'Billedet indgår i dit billedgitter.', on: true },
];

/* ---------- Billeder fra Figma ---------- */

/** Sti til et billede i public/img/figma (appen kører under en base-sti). */
export const figmaImg = (file: string) => `${import.meta.env.BASE_URL}img/figma/${file}`;

/** Billedet af dig selv, når du ikke har valgt et profilbillede. */
export const myAvatar = figmaImg('mig.jpg');

/** Profilbilleder til opslagets forfatter, hvis opslaget ikke selv har et. */
const authorAvatars: Record<string, string> = {
  'Mette Lund': figmaImg('mette.jpg'),
  'Jonas Krogh': figmaImg('jonas.jpg'),
  'Anna Nørgaard': figmaImg('anna.jpg'),
  Peter: figmaImg('peter.jpg'),
};
export const authorAvatar = (author: string, own?: string) => own ?? authorAvatars[author];

/* ---------- Del ---------- */

export type ShareTarget = { id: string; name: string; kind: 'Cirkel' | 'Besked'; tone: AvatarTone; avatarSrc?: string };

export const shareTargets: ShareTarget[] = [
  { id: 'familien', name: 'Familien', kind: 'Cirkel', tone: 'rose', avatarSrc: figmaImg('familie-soe.jpg') },
  { id: 'haandbold', name: 'Håndboldholdet', kind: 'Cirkel', tone: 'sand', avatarSrc: figmaImg('haandbold.jpg') },
  { id: 'jonas', name: 'Jonas Krogh', kind: 'Besked', tone: 'sage', avatarSrc: figmaImg('jonas.jpg') },
  { id: 'soeren', name: 'Søren Vang', kind: 'Besked', tone: 'blue', avatarSrc: figmaImg('person-c.jpg') },
];

export type ShareVisibility = 'cirkel' | 'venner' | 'offentligt';
export const shareVisibilities: { value: ShareVisibility; label: string }[] = [
  { value: 'cirkel', label: 'Cirkel' },
  { value: 'venner', label: 'Venner' },
  { value: 'offentligt', label: 'Offentligt' },
];

/* ---------- Rapportér ---------- */

export const reportReasons = [
  { id: 'had', title: 'Hadefuldt eller truende', hint: 'Trusler, chikane eller hadtale.' },
  { id: 'ulovligt', title: 'Ulovligt indhold', hint: 'Noget, der er ulovligt, hvor du bor.' },
  { id: 'svindel', title: 'Svindel eller falsk profil', hint: 'Forsøg på at snyde eller udgive sig for andre.' },
  { id: 'misinformation', title: 'Misinformation', hint: 'Påstande, der kan skade andre.' },
  { id: 'boern', title: 'Børns sikkerhed', hint: 'Noget, der kan skade et barn.' },
  { id: 'andet', title: 'Andet', hint: 'Noget, der ikke passer til listen.' },
];

/* ---------- Pronominer ---------- */

/*
 * Figma skriver "hende"/"hendes" om Mette og Anna. Eksempeldataene har
 * ikke køn, så vi slår op på fornavnet. Ukendte (fx foreninger) får "dem"/"deres".
 */
const female = ['Mette', 'Anna', 'Karen', 'Lene'];
const male = ['Jonas', 'Peter', 'Ahmed', 'Søren'];

export function pronouns(author: string) {
  const first = author.split(' ')[0] ?? author;
  if (female.includes(first)) return { object: 'hende', possessive: 'hendes', first };
  if (male.includes(first)) return { object: 'ham', possessive: 'hans', first };
  return { object: 'dem', possessive: 'deres', first: author };
}
