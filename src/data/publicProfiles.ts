import { handleOf } from './handles';
import { pageAccounts } from './sample';
import { pages } from './more';

/*
 * Offentlige profiler: personer, der optræder offentligt (fx politikere,
 * byplanlæggere, debattører), og alle sider (virksomheder og foreninger).
 * Deres opslag kan stemmes både op og ned. Almindelige brugere kan kun stemmes op.
 * Eksempeldata, ikke fra Figma.
 */
const publicPeople = ['anna.noergaard', 'peter.holm'];

const publicSet = new Set<string>([
  ...publicPeople,
  ...Object.values(pageAccounts).map((p) => handleOf(p.fullName)),
  ...pages.map((p) => handleOf(p.name)),
]);

export function isPublicProfile(nameOrHandle: string) {
  return publicSet.has(nameOrHandle) || publicSet.has(handleOf(nameOrHandle));
}
