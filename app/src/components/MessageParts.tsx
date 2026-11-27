import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Member } from '@/lib/conversations';
import { supabase } from '@/lib/supabase';
import { color, layout, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';
import { T } from './T';

/*
 * Fælles dele til Beskeder, Ny besked og Ny cirkel (prototypens screens/messages/shared.tsx + Messages.css).
 */

/** Sidehoved med luk-knap (X) og titel, som "Ny besked" og "Ny cirkel" */
export function CloseHeader({ title, fallback = '/beskeder', label = 'Luk', onClose, children }: { title: string; fallback?: Href; label?: string; onClose?: () => void; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)));
  return (
    <View style={[msg.header, { paddingTop: layout.topGap + insets.top }]}>
      <IconButton icon="close" label={label} variant="outline" onPress={close} />
      <T v="titleL" style={{ flex: 1, minWidth: 0 }} numberOfLines={1} accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

/** Rund markering til højre i en vælg-række (24 px) */
export function Radio({ on }: { on: boolean }) {
  return <View style={[msg.radio, on && msg.radioOn]}>{on && <View style={msg.radioDot} />}</View>;
}

/** Vælg-række med avatar, navn, relation og en rund markering til højre */
export function PickRow({ name, sub, path, selected, onToggle }: { name: string; sub: string; path?: string | null; selected: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      onPress={onToggle}
      style={({ pressed }) => [msg.card, pressed && !selected && { backgroundColor: color.bgSunken }, selected && msg.pickOn]}
    >
      <Avatar name={name} path={path} />
      <View style={msg.cardText}>
        <T v="headingS" numberOfLines={1}>
          {name}
        </T>
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {sub}
        </T>
      </View>
      <Radio on={selected} />
    </Pressable>
  );
}

/** "10.12", "I går", "Man." eller "12.11." – som tiderne i prototypens samtaleliste */
export function threadTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const two = (n: number) => String(n).padStart(2, '0');
  if (diff <= 0) return `${two(d.getHours())}.${two(d.getMinutes())}`;
  if (diff === 1) return 'I går';
  if (diff < 7) return `${['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'][d.getDay()]}.`;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export type Person = Member & { follows: boolean };

/** Uden søgning: dem, du følger. Med søgning: navn eller brugernavn (dem, du følger, først). */
export function usePeople(me: string, q: string, onlyFollowed = false) {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const term = q.trim().replace(/^@/, '').replace(/[%_,()]/g, '');
      const { data: f } = await supabase.from('follows').select('followee_id').eq('follower_id', me).eq('status', 'accepted').limit(200);
      const ids = new Set((f ?? []).map((r) => r.followee_id as string));
      let list: Member[] = [];
      if (term && !onlyFollowed) {
        const { data } = await supabase.from('profiles').select('id, username, name, avatar_path').or(`name.ilike.%${term}%,username.ilike.%${term}%`).neq('id', me).order('name').limit(25);
        list = (data ?? []) as Member[];
      } else if (ids.size) {
        const { data } = await supabase.from('profiles').select('id, username, name, avatar_path').in('id', [...ids]).order('name');
        list = ((data ?? []) as Member[]).filter((m) => !term || `${m.name} ${m.username}`.toLocaleLowerCase('da').includes(term.toLocaleLowerCase('da')));
      }
      const out = list.map((m) => ({ ...m, follows: ids.has(m.id) })).sort((a, b) => Number(b.follows) - Number(a.follows));
      if (alive) setPeople(out);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, me, onlyFollowed]);
  return people;
}

export const matches = (text: string, query: string) => text.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'));

export const msg = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: color.bgApp },
  /* .msg-content */
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 24 },
  /* Kort-række: hvid, 1 px kant, radius 18 */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  cardText: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  pickOn: { backgroundColor: color.accentVerifiedBg, borderColor: color.accentVerifiedText },
  radio: { width: 24, height: 24, flexShrink: 0, borderRadius: 12, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderWidth: 2, borderColor: color.textPrimary, backgroundColor: color.bgSurface },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.textPrimary },
  /* Ikonfelt i "Ny cirkel"-rækken: 44 px, radius 14 */
  tile: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.md, backgroundColor: color.avatarBlueBg, alignItems: 'center', justifyContent: 'center' },
  /* .msg-composer */
  composer: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgSurface },
});
