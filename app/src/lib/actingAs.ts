import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { supabase } from './supabase';

/*
 * Hvem du bruger ciircle som: dig selv eller en af dine sider (som at skifte konto på Instagram).
 * Som side: Profil viser siden, og nye opslag og moments laves som siden (vises under Interesser).
 * Valget huskes på enheden pr. bruger.
 */

export type PageRole = 'admin' | 'redaktoer' | 'moderator';
export type MyPage = { id: string; handle: string; name: string; avatar_path: string | null; followers: number; role: PageRole };

/** Rollernes navne og hvad de må (vises i Roller og adgang) */
export const pageRoles: { value: PageRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Fuld adgang: opslag, sidens oplysninger, roller og sletning af siden.' },
  { value: 'redaktoer', label: 'Redaktør', hint: 'Skriver, retter og sletter sidens opslag og retter sidens oplysninger.' },
  { value: 'moderator', label: 'Moderator', hint: 'Kan bruge appen som siden og se følgere, men ikke skrive opslag eller ændre siden.' },
];
export const roleLabel = (r: string | null | undefined) => pageRoles.find((x) => x.value === r)?.label ?? 'Admin';
/** Må skrive opslag som siden og rette sidens oplysninger */
export const canPost = (r: string | null | undefined) => r === 'admin' || r === 'redaktoer';
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

/** Dine sider (alle, hvor du har en rolle) */
export async function loadMyPages(userId: string) {
  const res = await supabase.from('page_cards').select('id, handle, name, avatar_path, followers, my_role').eq('i_admin', true).order('created_at');
  let data: unknown[] | null = res.data;
  // Databasen kender endnu ikke roller: alle er admin
  if (res.error) data = (await supabase.from('page_cards').select('id, handle, name, avatar_path, followers').eq('i_admin', true).order('created_at')).data;
  const pages = ((data ?? []) as (Omit<MyPage, 'role'> & { my_role?: PageRole | null })[]).map(({ my_role, ...p }) => ({ ...p, followers: Number(p.followers), role: my_role ?? 'admin' }));
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
