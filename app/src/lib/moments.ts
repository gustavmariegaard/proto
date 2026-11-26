import { supabase } from './supabase';

/* Moments (forsvinder efter 24 t) og highlights. Reglerne i databasen afgør, hvem der ser hvad. */

export type MomentCard = {
  id: string;
  author_id: string;
  page_id: string | null;
  media_path: string | null;
  media_type: 'image' | 'video';
  post_id: string | null;
  text: string;
  created_at: string;
  expires_at: string;
  author_username: string;
  author_name: string;
  author_avatar_path: string | null;
  page_handle: string | null;
  page_name: string | null;
  page_avatar_path: string | null;
  seen: boolean;
  liked: boolean;
  views: number | null;
};

export type Ring = {
  id: string;
  kind: 'person' | 'side';
  name: string;
  handle: string;
  avatar_path: string | null;
  unseen: boolean;
  mine?: boolean;
};

export async function personRings(): Promise<Ring[]> {
  const { data } = await supabase.rpc('moment_rings');
  return ((data ?? []) as any[]).map((r) => ({
    id: r.author_id,
    kind: 'person',
    name: r.name,
    handle: r.username,
    avatar_path: r.avatar_path,
    unseen: r.unseen,
    mine: r.mine,
  }));
}

export async function pageRings(): Promise<Ring[]> {
  const { data } = await supabase.rpc('page_moment_rings');
  return ((data ?? []) as any[]).map((r) => ({ id: r.page_id, kind: 'side', name: r.name, handle: r.handle, avatar_path: r.avatar_path, unseen: r.unseen }));
}

/** Aktive moments fra en person (kun personlige) eller en side, ældste først */
export async function activeMoments(id: string, kind: 'person' | 'side') {
  let q = supabase.from('moment_cards').select('*').gt('expires_at', new Date().toISOString()).order('created_at');
  q = kind === 'side' ? q.eq('page_id', id) : q.eq('author_id', id).is('page_id', null);
  const { data } = await q;
  return ((data ?? []) as MomentCard[]).map((m) => ({ ...m, views: m.views == null ? null : Number(m.views) }));
}

export async function markSeen(momentId: string, userId: string) {
  await supabase.from('moment_views').upsert({ moment_id: momentId, user_id: userId }, { onConflict: 'moment_id,user_id', ignoreDuplicates: true });
}

export async function setMomentLike(momentId: string, userId: string, on: boolean) {
  if (on) await supabase.from('moment_likes').insert({ moment_id: momentId, user_id: userId });
  else await supabase.from('moment_likes').delete().eq('moment_id', momentId).eq('user_id', userId);
}

export async function deleteMoment(id: string) {
  return supabase.from('moments').delete().eq('id', id);
}

/* ---------- Highlights ---------- */

export type Highlight = { id: string; owner_id: string; title: string; cover: MomentCard | null; count: number };

export async function highlightsFor(ownerId: string): Promise<Highlight[]> {
  const { data } = await supabase
    .from('highlights')
    .select('id, owner_id, title, created_at, highlight_items(position, moment_id)')
    .eq('owner_id', ownerId)
    .order('created_at');
  const list = (data ?? []) as any[];
  const ids = list.flatMap((h) => (h.highlight_items ?? []).map((i: any) => i.moment_id));
  const { data: ms } = ids.length ? await supabase.from('moment_cards').select('*').in('id', ids) : { data: [] };
  const byId = new Map(((ms ?? []) as MomentCard[]).map((m) => [m.id, m]));
  return list.map((h) => {
    const items = [...(h.highlight_items ?? [])].sort((a: any, b: any) => a.position - b.position);
    const cover = items.map((i: any) => byId.get(i.moment_id)).find((m: MomentCard | undefined) => m?.media_path && m.media_type === 'image') ?? byId.get(items[0]?.moment_id) ?? null;
    return { id: h.id, owner_id: h.owner_id, title: h.title, cover, count: items.length };
  });
}

export async function highlightMoments(id: string) {
  const { data: h } = await supabase.from('highlights').select('id, owner_id, title, highlight_items(position, moment_id)').eq('id', id).maybeSingle();
  if (!h) return null;
  const items = [...((h as any).highlight_items ?? [])].sort((a: any, b: any) => a.position - b.position);
  const ids = items.map((i: any) => i.moment_id);
  const { data: ms } = ids.length ? await supabase.from('moment_cards').select('*').in('id', ids) : { data: [] };
  const byId = new Map(((ms ?? []) as MomentCard[]).map((m) => [m.id, m]));
  return { id: h.id as string, owner_id: (h as any).owner_id as string, title: (h as any).title as string, moments: ids.map((i: string) => byId.get(i)).filter(Boolean) as MomentCard[] };
}

/** Alle dine egne moments (også udløbne), nyeste først – til highlights */
export async function myMoments(userId: string) {
  const { data } = await supabase.from('moment_cards').select('*').eq('author_id', userId).is('page_id', null).order('created_at', { ascending: false });
  return (data ?? []) as MomentCard[];
}

export async function saveHighlight(ownerId: string, title: string, momentIds: string[], id?: string) {
  let hid = id;
  if (hid) {
    const { error } = await supabase.from('highlights').update({ title }).eq('id', hid);
    if (error) throw error;
    await supabase.from('highlight_items').delete().eq('highlight_id', hid);
  } else {
    const { data, error } = await supabase.from('highlights').insert({ owner_id: ownerId, title }).select('id').single();
    if (error) throw error;
    hid = data.id as string;
  }
  if (momentIds.length) {
    const { error } = await supabase.from('highlight_items').insert(momentIds.map((m, i) => ({ highlight_id: hid, moment_id: m, position: i })));
    if (error) throw error;
  }
  return hid!;
}

export async function deleteHighlight(id: string) {
  return supabase.from('highlights').delete().eq('id', id);
}
