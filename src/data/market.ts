import type { AvatarTone } from '../components/Avatar';
import { img, side } from './sample';

/*
 * Eksempeldata til Torvet. De fire første annoncer er hentet fra Figma;
 * resten er ekstra, så filtrene har noget at vise.
 * Billederne genbruges fra public/img/figma og public/img/sider.
 */

export const categories = ['Alle', 'Møbler', 'Cykler', 'Børn', 'Elektronik', 'Fritid'] as const;
export type Category = (typeof categories)[number];
export type ListingCategory = Exclude<Category, 'Alle'>;
export const listingCategories = categories.filter((c): c is ListingCategory => c !== 'Alle');

export const conditions = ['Ny', 'Som ny', 'God', 'Brugt'] as const;
export type Condition = (typeof conditions)[number];

/** Hurtigvalg i arket "Søg i nærheden" */
export const radiusPresets = [5, 10, 25, 50, 100];
export const initialRadius = 25;
export const minRadius = 1;
export const maxRadius = 100;
export const myCity = 'Aarhus';

/** Højst så mange billeder i en annonce */
export const maxPhotos = 10;

/** Hurtige svar til sælgeren (som på Marketplace) */
export const quickReplies = ['Er den stadig til salg?', 'Kan du sende den?', 'Hvad er den laveste pris?'];

export type Seller = {
  name: string;
  tone: AvatarTone;
  avatarSrc?: string;
  /** Sælger på Torvet siden (år) */
  since: number;
};

export type Listing = {
  id: string;
  /** Pris i hele kroner */
  price: number;
  title: string;
  category: ListingCategory;
  condition: Condition;
  /** Afstand i km */
  km: number;
  /** Bydel/by, hvor den kan hentes, fx "Trøjborg, Aarhus" */
  location: string;
  /** Kan sendes med posten */
  shipping: boolean;
  /** Første billede er forsidebilledet */
  images: string[];
  description: string;
  seller: Seller;
  /** Fx "for 2 dage siden" (eksempeldata) */
  listed?: string;
  /** Tidspunkt (ms) for egne annoncer */
  createdAt?: number;
  /** Din egen annonce */
  mine?: boolean;
  sold?: boolean;
};

/** "1200" → "1.200 kr." */
export function formatPrice(kr: number) {
  if (kr === 0) return 'Gratis';
  return `${kr.toLocaleString('da-DK')} kr.`;
}

/** "Lige nu", "for 5 min. siden", "for 2 dage siden" */
export function listedText(l: Listing) {
  if (!l.createdAt) return l.listed ?? '';
  const min = Math.floor((Date.now() - l.createdAt) / 60000);
  if (min < 1) return 'Lige nu';
  if (min < 60) return `for ${min} min. siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'for 1 time siden' : `for ${h} timer siden`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'for 1 dag siden' : `for ${d} dage siden`;
}

export const listings: Listing[] = [
  {
    id: 'spisebord',
    price: 1200,
    title: 'Spisebord i massiv eg',
    category: 'Møbler',
    condition: 'God',
    km: 2,
    location: 'Trøjborg, Aarhus',
    shipping: false,
    images: [img('spisebord.jpg'), img('mad.jpg')],
    description:
      'Plads til seks – otte, hvis man rykker lidt sammen. Lidt brugsspor på bordpladen, ellers i fin stand. 180 × 90 cm. Afhentes i Trøjborg, jeg kan hjælpe med at bære.',
    seller: { name: 'Karen Bech', tone: 'sand', avatarSrc: img('person-b.jpg'), since: 2023 },
    listed: 'for 2 dage siden',
  },
  {
    id: 'ladcykel',
    price: 4500,
    title: 'Ladcykel, brugt',
    category: 'Cykler',
    condition: 'Brugt',
    km: 4,
    location: 'Frederiksbjerg, Aarhus',
    shipping: false,
    images: [img('cykel.jpg'), img('cykelsti.jpg'), side('vaerksted.jpg')],
    description:
      'Kasse med plads til to børn og regnslag. Nye bremser i år, og den har lige været til service på Cykelværkstedet. Ingen prøvetur uden depositum.',
    seller: { name: 'Søren Vang', tone: 'rose', avatarSrc: img('person-c.jpg'), since: 2024 },
    listed: 'for 5 timer siden',
  },
  {
    id: 'boernetoej',
    price: 150,
    title: 'Børnetøj str. 92–104',
    category: 'Børn',
    condition: 'Som ny',
    km: 1,
    location: 'Vesterbro, Aarhus',
    shipping: true,
    images: [img('toej.jpg')],
    description: 'En pose med bukser, trøjer og en flyverdragt. Røg- og dyrefrit hjem. Kan sendes for 45 kr.',
    seller: { name: 'Pernille Sørensen', tone: 'sand', avatarSrc: img('person-f.jpg'), since: 2022 },
    listed: 'i går',
  },
  {
    id: 'baerbar',
    price: 2900,
    title: 'Bærbar, 14 tommer',
    category: 'Elektronik',
    condition: 'God',
    km: 6,
    location: 'Risskov, Aarhus',
    shipping: true,
    images: [img('computer.jpg')],
    description: 'Tre år gammel. Batteriet holder en hel arbejdsdag. Oplader og original æske følger med. Nulstillet og klar.',
    seller: { name: 'Jonas Krogh', tone: 'sage', avatarSrc: img('jonas.jpg'), since: 2023 },
    listed: 'for 3 dage siden',
  },
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  {
    id: 'havemoebler',
    price: 800,
    title: 'Havebord med to stole',
    category: 'Møbler',
    condition: 'God',
    km: 12,
    location: 'Viby J',
    shipping: false,
    images: [img('have.jpg'), img('aften.jpg')],
    description: 'Teak, olieret i foråret. Kan stå ude hele året. Vi flytter i lejlighed og har ikke plads.',
    seller: { name: 'Mette Lund', tone: 'blue', avatarSrc: img('mette.jpg'), since: 2023 },
    listed: 'for 1 uge siden',
  },
  {
    id: 'haandboldsko',
    price: 350,
    title: 'Indendørssko str. 42',
    category: 'Fritid',
    condition: 'Som ny',
    km: 8,
    location: 'Hasle, Aarhus',
    shipping: true,
    images: [img('haandbold.jpg'), side('hallen.jpg')],
    description: 'Brugt til tre træninger i hallen, så er de blevet for små. Gode til håndbold og badminton.',
    seller: { name: 'Jonas Krogh', tone: 'sage', avatarSrc: img('jonas.jpg'), since: 2023 },
    listed: 'for 4 dage siden',
  },
  {
    id: 'boeger',
    price: 100,
    title: 'Kasse med 20 romaner',
    category: 'Fritid',
    condition: 'Brugt',
    km: 3,
    location: 'Midtbyen, Aarhus',
    shipping: false,
    images: [side('bibliotek.jpg')],
    description: 'Blandet krimi og nyere danske romaner. Tages samlet. Hentes i Midtbyen.',
    seller: { name: 'Karen Bech', tone: 'sand', avatarSrc: img('person-b.jpg'), since: 2023 },
    listed: 'for 6 dage siden',
  },
  {
    id: 'racercykel',
    price: 2200,
    title: 'Racercykel, 56 cm stel',
    category: 'Cykler',
    condition: 'God',
    km: 40,
    location: 'Silkeborg',
    shipping: false,
    images: [img('cykelsti.jpg'), img('cykel.jpg')],
    description: 'Let aluminiumsstel og 22 gear. Kørt cirka 3.000 km.',
    seller: { name: 'Peter Holm', tone: 'rose', avatarSrc: img('peter.jpg'), since: 2025 },
    listed: 'for 2 uger siden',
    sold: true,
  },
];
