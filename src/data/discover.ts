import { img, posts, type FeedPost } from './sample';

/*
 * Eksempeldata til Opdag (Offentlig debat).
 * De to første opslag og alle emner er hentet fra Figma; resten er ekstra eksempelindhold.
 */

export type DiscoverPost = FeedPost & {
  topic: string;
  /** Aktuelle emner, opslaget handler om */
  trends: string[];
  /** true, når opslaget findes i sample.ts og kan åbnes på /opslag/:id */
  linkable: boolean;
  /** Tags, opslaget er sat i (emnet og de aktuelle emner) */
  tags: string[];
  /** Op- minus nedstemmer fra andre (din egen stemme lægges til) */
  score: number;
};

/** Faste eksempelscorer pr. opslag */
function baseScore(id: string) {
  let h = 5;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 3 + (h % 140);
}

/** Hent et opslag fra sample.ts, men vis kun emnet under navnet (som i Figma). */
function fromSample(id: string, topic: string, trendTags: string[]): DiscoverPost {
  const p = posts.find((x) => x.id === id)!;
  return { ...p, meta: topic, topic, trends: trendTags, linkable: true, tags: [topic, ...trendTags], score: baseScore(id) };
}

function extra(
  id: string,
  author: string,
  avatar: string,
  tone: FeedPost['tone'],
  topic: string,
  text: string,
  trendTags: string[],
): DiscoverPost {
  return {
    id,
    feed: 'interesser',
    author,
    avatarSrc: img(avatar),
    tone,
    meta: topic,
    text,
    topic,
    trends: trendTags,
    linkable: false,
    tags: [topic, ...trendTags],
    score: baseScore(id),
  };
}

export const discoverPosts: DiscoverPost[] = [
  // Fra Figma
  fromSample('p-anna', 'Byudvikling', ['Cykelstier']),
  extra(
    'd-peter',
    'Peter Holm',
    'peter.jpg',
    'sand',
    'Kultur',
    'Lokale spillesteder har brug for flere, der møder op på hverdage, ikke kun til festivaler.',
    [],
  ),
  /* ---------- Ekstra eksempelindhold (ikke fra Figma) ---------- */
  extra(
    'd-karen',
    'Karen Bech',
    'person-b.jpg',
    'sage',
    'Kultur',
    'Julemarkedet på torvet åbner 1. december. Vi mangler frivillige til boderne om lørdagen.',
    ['Julemarked'],
  ),
  fromSample('p-byudvikling-2', 'Byudvikling', ['Klima']),
  fromSample('p-kultur-2', 'Kultur', []),
  extra(
    'd-ahmed',
    'Ahmed Rahimi',
    'person-e.jpg',
    'blue',
    'Skole',
    'Skolevalget er i næste uge. Hvad er vigtigst for jer: mindre klasser eller flere timer med idræt?',
    ['Skolevalg'],
  ),
  fromSample('p-cykling', 'Cykling', ['Cykelstier']),
  extra(
    'd-jonas',
    'Jonas Krogh',
    'jonas.jpg',
    'sage',
    'Sport',
    'Den nye kunstgræsbane ved hallen er klar. Den er åben for alle, også uden for klubtiderne.',
    ['Sport'],
  ),
  fromSample('p-musik', 'Musik', []),
  fromSample('p-madlavning', 'Madlavning', []),
  fromSample('p-fotografi', 'Fotografi', []),
  fromSample('p-loeb', 'Løb', ['Sport']),
  /* Et omdiskuteret opslag lige over grænsen: én nedstemme mere, og det forsvinder fra emnet */
  { ...extra(
    'd-lars',
    'Lars Møller',
    '',
    'sand',
    'Byudvikling',
    'Fjern cykelstierne på Vestergade, og lav dem om til parkering. Ingen cykler alligevel om vinteren.',
    ['Cykelstier'],
  ), avatarSrc: undefined, score: -4 },
];
