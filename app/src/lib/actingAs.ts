import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from './supabase';

/*
 * Hvem du bruger ciircle som: dig selv eller en af dine sider (som at skifte konto på Instagram).
 * Som side: Profil viser siden, og nye opslag og moments laves som siden (vises under Interesser).
 * Valget huskes på enheden pr. bruger.
 */

export type MyPage = { id: string; handle: string; name: string; avatar_path: string | null; followers: number };
export type Acting = { kind: 'person' } | ({ kind: 'side' } & MyPage);

const PERSON: Acting = { kind: 'person' };
let state: { acting: Acting; pages: MyPage[] | null; userId: string | null } = { acting: PERSON, pages: null, userId: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<typeof state>) => {
  state = { ...state, ...patch };
  emit();
};
const key = (userId: string) => `ciircle.actingAs.${userId}`;

/** Dine sider (dem du er admin for) */
export async function loadMyPages(userId: string) {
  const { data } = await supabase.from('page_cards').select('id, handle, name, avatar_path, followers').eq('i_admin', true).order('created_at');
  const pages = ((data ?? []) as MyPage[]).map((p) => ({ ...p, followers: Number(p.followers) }));
  // Er siden slettet, eller er du ikke længere admin, skiftes tilbage til dig selv
  const a = state.acting;
  const fresh = a.kind === 'side' ? pages.find((p) => p.id === a.id) : null;
  set({ pages, userId, acting: a.kind === 'side' ? (fresh ? { kind: 'side', ...fresh } : PERSON) : a });
  if (a.kind === 'side' && !fresh) AsyncStorage.removeItem(key(userId)).catch(() => {});
  return pages;
}

export async function switchTo(userId: string, page: MyPage | null) {
  set({ acting: page ? { kind: 'side', ...page } : PERSON });
  try {
    if (page) await AsyncStorage.setItem(key(userId), page.id);
    else await AsyncStorage.removeItem(key(userId));
  } catch {
    /* Ikke kritisk */
  }
}

/** Hvem du bruger appen som lige nu. Indlæser dine sider og dit sidste valg første gang. */
export function useActingAs(userId: string) {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    if (state.userId === userId && state.pages) return;
    (async () => {
      const saved = await AsyncStorage.getItem(key(userId)).catch(() => null);
      const pages = await loadMyPages(userId);
      const p = saved ? pages.find((x) => x.id === saved) : null;
      if (p) set({ acting: { kind: 'side', ...p } });
    })();
  }, [userId]);
  const refresh = useCallback(() => loadMyPages(userId), [userId]);
  return { acting: snap.userId === userId ? snap.acting : PERSON, pages: snap.pages ?? [], refresh, switchTo: (p: MyPage | null) => switchTo(userId, p) };
}
