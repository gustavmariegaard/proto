import { router } from 'expo-router';
import { supabase } from './supabase';

/** @brugernavn eller @side – samme tegn som brugernavne (2–30 tegn) */
export const MENTION = /@[A-Za-z0-9._æøåÆØÅ]{2,30}/g;

export type MentionHit = { kind: 'person' | 'side'; handle: string; name: string; avatar_path: string | null };

/** Del en tekst i almindelig tekst og @tags. Punktum til sidst hører til sætningen, ikke navnet. */
export function splitMentions(text: string): { text: string; handle?: string }[] {
  const out: { text: string; handle?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const raw = m[0];
    const handle = raw.slice(1).replace(/\.+$/, '');
    if (handle.length < 2) continue;
    const start = m.index ?? 0;
    // Kun når @ står i starten eller efter et mellemrum/tegn (ikke midt i en e-mail)
    if (start > 0 && /[A-Za-z0-9._æøåÆØÅ]/.test(text[start - 1])) continue;
    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ text: `@${handle}`, handle: handle.toLowerCase() });
    last = start + 1 + handle.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Åbn en person eller en side ud fra et @navn (personer først) */
export async function openMention(handle: string, myUsername?: string) {
  const h = handle.toLowerCase();
  if (myUsername && h === myUsername.toLowerCase()) return router.push('/profil');
  const { data: p } = await supabase.from('profiles').select('username').eq('username', h).maybeSingle();
  if (p) return router.push(`/bruger/${p.username}`);
  const { data: pg } = await supabase.from('pages').select('handle').eq('handle', h).maybeSingle();
  if (pg) return router.push(`/sider/${pg.handle}`);
}

/** Det @ord, man er i gang med at skrive ved markøren, fx "an" i "Hej @an|" */
export function activeMention(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const m = before.match(/(^|[^A-Za-z0-9._æøåÆØÅ])@([A-Za-z0-9._æøåÆØÅ]{0,30})$/);
  if (!m) return null;
  return { query: m[2].toLowerCase(), start: cursor - m[2].length - 1 };
}

/** Forslag: personer og sider, der matcher. Uden søgeord: dem, du følger. */
export async function searchMentions(q: string, meId: string): Promise<MentionHit[]> {
  const like = `%${q.replace(/[%_]/g, '')}%`;
  if (!q) {
    const { data } = await supabase
      .from('follows')
      .select('profiles!follows_followee_id_fkey(username, name, avatar_path)')
      .eq('follower_id', meId)
      .eq('status', 'accepted')
      .limit(6);
    return ((data ?? []) as unknown as { profiles: { username: string; name: string; avatar_path: string | null } | null }[])
      .filter((r) => r.profiles)
      .map((r) => ({ kind: 'person', handle: r.profiles!.username, name: r.profiles!.name, avatar_path: r.profiles!.avatar_path }));
  }
  const [{ data: people }, { data: pages }] = await Promise.all([
    supabase.from('profiles').select('username, name, avatar_path').neq('id', meId).or(`username.ilike.${like},name.ilike.${like}`).limit(5),
    supabase.from('pages').select('handle, name, avatar_path').or(`handle.ilike.${like},name.ilike.${like}`).limit(3),
  ]);
  return [
    ...((people ?? []) as { username: string; name: string; avatar_path: string | null }[]).map((p) => ({ kind: 'person' as const, handle: p.username, name: p.name, avatar_path: p.avatar_path })),
    ...((pages ?? []) as { handle: string; name: string; avatar_path: string | null }[]).map((p) => ({ kind: 'side' as const, handle: p.handle, name: p.name, avatar_path: p.avatar_path })),
  ];
}
