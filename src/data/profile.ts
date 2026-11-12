import { img } from './sample';

/*
 * Eksempeldata til profilen (din egen). Tekster er hentet fra Figma.
 * Navn, brugernavn, profilbillede og interesser kommer fra sessionen.
 */

/** Dit profilbillede, hvis du ikke selv har valgt et */
export const fallbackAvatar = img('mig.jpg');

export type Photo = {
  id: string;
  src: string;
  /** Fx "For 2 timer siden" */
  time: string;
  /** Album eller kategori, vises efter tiden: "For 2 timer siden · Portræt" */
  album?: string;
  caption?: string;
};

/** Dine billeder. De første seks er dem, Figma viser under Billeder
 * (lagt skiftevis i venstre og højre kolonne). */
export const photos: Photo[] = [
  { id: 'soe', src: img('soe.jpg'), time: 'For 2 timer siden' },
  { id: 'cykelsti', src: img('cykelsti.jpg'), time: 'I går' },
  { id: 'have', src: img('have.jpg'), time: 'For 2 timer siden', album: 'Portræt', caption: 'Sidste dag på sommerhuset.' },
  { id: 'mad', src: img('mad.jpg'), time: 'Man.' },
  { id: 'familie-soe', src: img('familie-soe.jpg'), time: 'I går' },
  { id: 'aften', src: img('aften.jpg'), time: 'Søn.' },
  { id: 'haandbold', src: img('haandbold.jpg'), time: 'Søn.' },
  { id: 'spisebord', src: img('spisebord.jpg'), time: 'Lør.' },
  { id: 'nyhavn', src: img('nyhavn.jpg'), time: 'Lør.' },
  { id: 'cykel', src: img('cykel.jpg'), time: 'Fre.' },
];

export const photoById = (id: string) => photos.find((p) => p.id === id);

/** Højder fra Figmas masonry (Billeder): venstre 190/120/170, højre 120/190/130 */
export const photoHeights = [190, 120, 120, 190, 170, 130];

export type TextPost = { id: string; text: string; time: string };

export const pinnedPost = {
  text: 'Velkommen til min profil. Her deler jeg små tanker og billeder fra hverdagen.',
  note: 'Fastgjort af dig',
};

export const textPosts: TextPost[] = [
  { id: 't1', text: 'Sidste dag på sommerhuset. Tak for alle de gode timer.', time: '2 t.' },
  { id: 't2', text: 'Er der nogen, der vil med til byparken i weekenden?', time: 'I går' },
  { id: 't3', text: 'Jeg har fundet en god cykelrute langs åen. Skriv, hvis I vil have den.', time: 'Man.' },
  { id: 't4', text: 'Tak for en dejlig aften i hallen. Vi ses torsdag.', time: 'Søn.' },
];

/** Billederne i "Alt" mellem de to tekstopslag (venstre 170/100, højre 100/170; skiftevis venstre/højre) */
export const latestPhotos: { id: string; height: number }[] = [
  { id: 'soe', height: 170 },
  { id: 'cykelsti', height: 100 },
  { id: 'have', height: 100 },
  { id: 'familie-soe', height: 170 },
];

export type Flick = { id: string; src: string; height: number; label: string };

/** Dine flicks (Figma: venstre 230/180, højre 180/230) */
export const myFlicks: Flick[] = [
  { id: 'f1', src: img('haandbold.jpg'), height: 230, label: 'Flick fra hallen' },
  { id: 'f2', src: img('cykelsti.jpg'), height: 180, label: 'Flick fra cykelstien' },
  { id: 'f3', src: img('mad.jpg'), height: 180, label: 'Flick fra middagen' },
  { id: 'f4', src: img('dans.jpg'), height: 230, label: 'Flick fra dansen' },
];

export type Collection = { id: string; title: string; cover: string; photoIds: string[] };

export const initialCollections: Collection[] = [
  { id: 'sommer', title: 'Sommer', cover: 'have', photoIds: ['soe', 'cykelsti', 'have', 'mad', 'familie-soe', 'aften'] },
  { id: 'haandbold', title: 'Håndbold', cover: 'haandbold', photoIds: ['haandbold', 'aften', 'cykel'] },
  { id: 'familien', title: 'Familien', cover: 'familie-soe', photoIds: ['familie-soe', 'spisebord', 'mad', 'have'] },
];

/** Interesser, Figma viser på skærmen Interesser */
export const interestOptions = ['Kultur', 'Byudvikling', 'Musik', 'Cykling', 'Madlavning', 'Fotografi', 'Film', 'Løb', 'Klima'];

/** "Måske kunne du også lide" */
export const interestSuggestions = ['Litteratur', 'Havearbejde', 'Sport'];
