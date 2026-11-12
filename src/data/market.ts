import type { AvatarTone } from '../components/Avatar';
import { img } from './sample';

/*
 * Eksempeldata til Torvet. De fire første annoncer er hentet fra Figma;
 * de to sidste er ekstra, så afstandsfilteret har noget at vise.
 */

export const categories = ['Alle', 'Møbler', 'Cykler', 'Børn', 'Elektronik'] as const;
export type Category = (typeof categories)[number];

/** Hurtigvalg i arket "Søg i nærheden" */
export const radiusPresets = [5, 10, 25, 50, 100];
export const initialRadius = 25;
export const minRadius = 1;
export const maxRadius = 100;
export const myCity = 'Aarhus';

export type Listing = {
  id: string;
  /** Fx "1.200 kr." */
  price: string;
  title: string;
  category: Exclude<Category, 'Alle'>;
  /** Afstand i km */
  km: number;
  image: string;
  description: string;
  seller: { name: string; tone: AvatarTone; avatarSrc?: string };
  /** Samtale i Beskeder, hvis der allerede er en */
  threadId?: string;
};

export const listings: Listing[] = [
  {
    id: 'spisebord',
    price: '1.200 kr.',
    title: 'Spisebord i massiv eg',
    category: 'Møbler',
    km: 2,
    image: img('spisebord.jpg'),
    description: 'Plads til seks. Lidt brugsspor på bordpladen. Afhentes i Trøjborg.',
    seller: { name: 'Karen B.', tone: 'sand', avatarSrc: img('person-b.jpg') },
    threadId: 'karen',
  },
  {
    id: 'ladcykel',
    price: '4.500 kr.',
    title: 'Ladcykel, brugt',
    category: 'Cykler',
    km: 4,
    image: img('cykel.jpg'),
    description: 'Kasse med plads til to børn og regnslag. Nye bremser i år.',
    seller: { name: 'Søren Vang', tone: 'rose', avatarSrc: img('person-c.jpg') },
  },
  {
    id: 'boernetoej',
    price: '150 kr.',
    title: 'Børnetøj str. 92–104',
    category: 'Børn',
    km: 1,
    image: img('toej.jpg'),
    description: 'En pose med bukser, trøjer og en flyverdragt. Røg- og dyrefrit hjem.',
    seller: { name: 'Pernille Sørensen', tone: 'sand', avatarSrc: img('person-f.jpg') },
  },
  {
    id: 'baerbar',
    price: '2.900 kr.',
    title: 'Bærbar, 14 tommer',
    category: 'Elektronik',
    km: 6,
    image: img('computer.jpg'),
    description: 'Tre år gammel. Batteriet holder en hel arbejdsdag. Oplader følger med.',
    seller: { name: 'Jonas Krogh', tone: 'sage', avatarSrc: img('jonas.jpg') },
  },
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  {
    id: 'havemoebler',
    price: '800 kr.',
    title: 'Havebord med to stole',
    category: 'Møbler',
    km: 12,
    image: img('have.jpg'),
    description: 'Teak, olieret i foråret. Kan stå ude hele året.',
    seller: { name: 'Mette Lund', tone: 'blue', avatarSrc: img('mette.jpg') },
  },
  {
    id: 'racercykel',
    price: '2.200 kr.',
    title: 'Racercykel, 56 cm stel',
    category: 'Cykler',
    km: 40,
    image: img('cykelsti.jpg'),
    description: 'Let aluminiumsstel og 22 gear. Kørt cirka 3.000 km.',
    seller: { name: 'Peter', tone: 'rose', avatarSrc: img('peter.jpg') },
  },
];
