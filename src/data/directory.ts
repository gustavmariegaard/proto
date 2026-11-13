import type { AvatarTone } from '../components/Avatar';
import { handleOf } from './handles';
import { contacts } from './messages';
import { pages } from './more';
import { moments, pageAccounts, people, posts } from './sample';
import { discoverPosts } from './discover';

/*
 * Alle profiler i prototypen (personer og sider), slået op på brugernavn.
 * Samler oplysninger fra moments, opslag, sider og kontakter.
 */

export type Account = {
  handle: string;
  name: string;
  kind: 'person' | 'side';
  tone: AvatarTone;
  avatarSrc?: string;
  /** Id i moments-listen, hvis de har moments lige nu */
  momentsId?: string;
  bio?: string;
  /** Følges fra start */
  followed: boolean;
  /** Personen følger dig (sider følger aldrig tilbage) */
  followsMe: boolean;
};

/** Korte tekster om nogle af profilerne (eksempler, ikke fra Figma) */
const bios: Record<string, string> = {
  'mette.lund': 'Lange gåture, kolde søer og for meget kaffe.',
  'jonas.krogh': 'Træner for Håndboldholdet. Altid klar til en kamp.',
  'anna.noergaard': 'Byplanlægger. Interesseret i cykelstier og grønne byrum.',
  'peter.holm': 'Musik, fællesskab og god mad.',
  'sofie.holm': 'Bager surdejsbrød – med vekslende held.',
  'ahmed.rahimi': 'Nyt i kvarteret. Siger altid ja til en kop kaffe.',
  'karen.bech': 'Arrangerer fællesspisning i gården.',
  kulturhuset: 'Koncerter, teater og foredrag for hele byen.',
  hallen: 'Byens idrætshal. Træning, kampe og arrangementer.',
  'det.lokale.bageri': 'Friskbagt brød fra klokken 6 hver morgen.',
  cykelvaerkstedet: 'Reparation og service af cykler. Kig forbi.',
  'byens.bibliotek': 'Bøger, it-hjælp og arrangementer for alle aldre.',
  teaterforeningen: 'Amatørteater for alle, der har lyst at være med.',
};

let cache: Map<string, Account> | null = null;

function build() {
  const map = new Map<string, Account>();
  const add = (a: Omit<Account, 'handle' | 'bio' | 'followsMe'> & { followsMe?: boolean }) => {
    const handle = handleOf(a.name);
    const prev = map.get(handle);
    map.set(handle, {
      ...a,
      ...prev,
      handle,
      avatarSrc: prev?.avatarSrc ?? a.avatarSrc,
      momentsId: prev?.momentsId ?? a.momentsId,
      followed: (prev?.followed ?? false) || a.followed,
      followsMe: a.kind === 'person' && ((prev?.followsMe ?? false) || Boolean(a.followsMe)),
      bio: bios[handle],
    });
  };
  const hasMoments = (id: string) => moments.some((m) => m.personId === id);
  Object.entries(people).forEach(([id, p]) =>
    add({ name: p.fullName, kind: 'person', tone: p.tone, avatarSrc: p.avatarSrc, momentsId: hasMoments(id) ? id : undefined, followed: true, followsMe: true }),
  );
  Object.entries(pageAccounts).forEach(([id, p]) =>
    add({ name: p.fullName, kind: 'side', tone: p.tone, avatarSrc: p.avatarSrc, momentsId: hasMoments(id) ? id : undefined, followed: true }),
  );
  pages.forEach((p) => add({ name: p.name, kind: 'side', tone: p.tone, avatarSrc: p.avatarSrc, followed: true }));
  contacts.forEach((c) => add({ name: c.name, kind: 'person', tone: c.tone, avatarSrc: c.avatarSrc, followed: c.friend, followsMe: c.friend }));
  [...posts, ...discoverPosts].forEach((p) =>
    add({
      name: p.author,
      kind: p.meta.startsWith('Side') ? 'side' : 'person',
      tone: p.tone ?? 'sand',
      avatarSrc: p.avatarSrc,
      followed: p.feed !== 'debat',
    }),
  );
  return map;
}

export function findAccount(handle: string): Account | undefined {
  cache ??= build();
  return cache.get(handle);
}

/** Opslag fra en profil: fra feedet og fra Offentlig debat */
export const debatePostsBy = (handle: string) => discoverPosts.filter((p) => handleOf(p.author) === handle);
