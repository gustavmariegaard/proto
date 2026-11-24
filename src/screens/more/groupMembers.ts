import type { AvatarTone } from '../../components/Avatar';
import { people } from '../../data/sample';

/*
 * Medlemmer i en gruppe (eksempel). Personer appen kender står først
 * (forfattere af opslag i gruppen allerførst), resten fyldes op med navne,
 * så listen passer med medlemstallet.
 */
export type Member = { name: string; tone: AvatarTone; avatarSrc?: string; admin?: boolean; known: boolean };

const first = ['Mads', 'Ida', 'Emil', 'Freja', 'Oliver', 'Clara', 'Noah', 'Alma', 'Lucas', 'Ella', 'William', 'Agnes', 'Oscar', 'Karla', 'Victor', 'Asta', 'Magnus', 'Laura', 'Frederik', 'Josefine', 'Malthe', 'Sofia', 'Anton', 'Emma'];
const last = ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen', 'Poulsen'];
const tones: AvatarTone[] = ['sand', 'blue', 'sage', 'rose'];

function hash(s: string) {
  let h = 3;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Antal medlemmer (fast pr. gruppe) */
export const memberCount = (groupId: string) => 12 + (hash(groupId) % 180);

export function membersOf(groupId: string, authors: string[] = []): Member[] {
  const known = Object.values(people).map((p) => ({ name: p.fullName, tone: p.tone, avatarSrc: p.avatarSrc, known: true }));
  const k = hash(groupId) % known.length;
  const rotated = [...known.slice(k), ...known.slice(0, k)];
  const ordered = [...rotated.filter((p) => authors.includes(p.name)), ...rotated.filter((p) => !authors.includes(p.name))];
  const total = memberCount(groupId);
  const filler: Member[] = [];
  for (let i = 0; ordered.length + filler.length < total; i++) {
    const h = hash(`${groupId}-${i}`);
    filler.push({ name: `${first[h % first.length]} ${last[(h >>> 7) % last.length]}`, tone: tones[h % 4]!, known: false });
  }
  return [...ordered, ...filler].map((m, i) => ({ ...m, admin: i === 0 }));
}
