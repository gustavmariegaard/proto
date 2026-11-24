import { handleOf } from './handles';
import { pageAccounts } from './sample';
import { pages } from './more';

/*
 * To slags offentlige profiler. Begge kan stemmes både op og ned.
 * - Offentlig person: en person, der optræder offentligt (fx politiker, byplanlægger, debattør). Megafon.
 * - Side: en virksomhed eller forening (fx bageriet, hallen). Bygning.
 * Almindelige brugere kan kun stemmes op. Eksempeldata, ikke fra Figma.
 */
export type PublicKind = 'person' | 'side';

const publicPeople = ['anna.noergaard', 'peter.holm'];
const pageHandles = new Set<string>([
  ...Object.values(pageAccounts).map((p) => handleOf(p.fullName)),
  ...pages.map((p) => handleOf(p.name)),
]);

export function publicKind(nameOrHandle: string): PublicKind | null {
  const h = pageHandles.has(nameOrHandle) || publicPeople.includes(nameOrHandle) ? nameOrHandle : handleOf(nameOrHandle);
  if (pageHandles.has(h)) return 'side';
  if (publicPeople.includes(h)) return 'person';
  return null;
}

export const isPublicProfile = (nameOrHandle: string) => publicKind(nameOrHandle) !== null;

export const publicLabel: Record<PublicKind, string> = { person: 'Offentlig person', side: 'Side' };
