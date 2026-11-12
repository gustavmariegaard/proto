import type { Post } from '../components/PostCard';
import type { AvatarTone } from '../components/Avatar';

/*
 * Eksempeldata. Tekster er hentet fra Figma.
 * Læg billeder i public/img og skriv stien her, fx image: '/img/aften.jpg'.
 */

export const moments: { name: string; state: 'new' | 'seen'; tone: AvatarTone }[] = [
  { name: 'Mette', state: 'new', tone: 'sand' },
  { name: 'Jonas', state: 'new', tone: 'blue' },
  { name: 'Anna', state: 'seen', tone: 'sage' },
];

export const posts: Post[] = [
  {
    id: 'p1',
    author: 'Mette Lund',
    tone: 'sand',
    meta: 'Til Venner · for 2 timer siden',
    text: 'Sidste aften før vinteren sætter ind. Tak for en god sommer, alle sammen.',
    image: true,
  },
  {
    id: 'p2',
    author: 'Mette Lund',
    tone: 'blue',
    meta: 'Til Venner · for 2 timer siden',
    text: 'Sidste aften før vinteren sætter ind. Tak for en god sommer, alle sammen.',
  },
];
