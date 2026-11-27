import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/*
 * Seneste aktivitet i grupper og sider (til rækkerne i Grupper og Sider)
 * og hvornår du sidst åbnede dem (til den mint prik ved nyt).
 */

export type Latest = { at: string; by: string };

/** Nyeste opslag pr. gruppe eller side */
export async function latestPosts(col: 'group_id' | 'page_id', ids: string[]) {
  const out: Record<string, Latest> = {};
  if (!ids.length) return out;
  const { data } = await supabase.from('post_cards').select(`${col}, created_at, author_id`).in(col, ids).order('created_at', { ascending: false }).limit(1000);
  for (const r of (data ?? []) as any[]) {
    const id = r[col] as string;
    if (!out[id]) out[id] = { at: r.created_at, by: r.author_id };
  }
  return out;
}

const key = (id: string) => `seen:${id}`;

/** Hvornår du sidst åbnede gruppen/siden (ms) */
export async function seenTimes(ids: string[]) {
  const out: Record<string, number> = {};
  try {
    const rows = await AsyncStorage.multiGet(ids.map(key));
    rows.forEach(([k, v]) => {
      if (v) out[k.slice(5)] = Number(v);
    });
  } catch {}
  return out;
}

export async function markSeen(id: string) {
  try {
    await AsyncStorage.setItem(key(id), String(Date.now()));
  } catch {}
}

/** Nyt opslag fra en anden, siden du sidst kiggede (aldrig åbnet: de seneste 3 dage) */
export function isUnread(latest: Latest | undefined, seen: number | undefined, me: string) {
  if (!latest || latest.by === me) return false;
  return new Date(latest.at).getTime() > (seen ?? Date.now() - 3 * 86400000);
}
