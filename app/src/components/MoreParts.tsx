import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, radius, TAP } from '@/theme/tokens';
import { Avatar, type AvatarTone } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { PageHeader } from './PageHeader';
import { T } from './T';

/*
 * Byggeklodser til Mere-skærmene (Udvid cirkel, Grupper, Sider, Opret) –
 * prototypens screens/more/parts.tsx og More.css.
 */

/** .more-screen + .more-content: sidehoved og indhold, der ruller (padding 4/20/24, 16 px mellemrum) */
export function MoreScreen({
  title,
  fallback = '/',
  action,
  tight,
  children,
}: {
  title: string;
  fallback?: Href;
  /** Tekst-knap (Ghost) til højre, fx "Opret gruppe" */
  action?: { label: string; onPress: () => void };
  /** 14 px mellemrum (Udvid cirkel) */
  tight?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      <PageHeader title={title} fallback={fallback}>
        {action && (
          <Button variant="ghost" onPress={action.onPress}>
            {action.label}
          </Button>
        )}
      </PageHeader>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, tight && { gap: 14 }, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** To bogstaver ud fra navnet, fx "Bogklubben" → "BO", "Byens bibliotek" → "BB" (prototypens initialsOf) */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}

const tones: AvatarTone[] = ['sand', 'blue', 'sage', 'rose'];
/** Fast farve ud fra navnet (prototypens pickTone) */
export const pickTone = (name: string) => tones[name.length % tones.length]!;

/** Avatar med prototypens initialer (to bogstaver), da den fælles Avatar selv udregner dem */
export function InitialsAvatar({ name, path, size = 'L' }: { name: string; path?: string | null; size?: 'S' | 'M' | 'L' }) {
  // Avatar tager de første bogstaver af to ord: "L Ø" → "LØ"
  return <Avatar name={initialsOf(name).split('').join(' ')} path={path} size={size} tone={pickTone(name)} />;
}

/** Række i Grupper og Sider: avatar, navn, seneste aktivitet og en mint prik ved nyt */
export function CommunityRow({ name, path, meta, unread, onPress }: { name: string; path?: string | null; meta: string; unread?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${meta}${unread ? '. Ny aktivitet' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
    >
      <InitialsAvatar name={name} path={path} />
      <View style={s.rowText}>
        <T v="headingS" numberOfLines={1}>
          {name}
        </T>
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {meta}
        </T>
      </View>
      {unread && <View style={s.dot} />}
    </Pressable>
  );
}

export type SortMode = 'seneste' | 'navn';

/** "30 grupper" til venstre og et sorteringsvalg til højre */
export function SortRow({ count, sort, onSort }: { count: string; sort: SortMode; onSort: (s: SortMode) => void }) {
  return (
    <View style={s.sort}>
      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {count}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sortér: ${sort === 'seneste' ? 'Seneste aktivitet' : 'Navn'}. Tryk for at skifte`}
        onPress={() => onSort(sort === 'seneste' ? 'navn' : 'seneste')}
        style={s.sortBtn}
      >
        <T v="captionStrong">{sort === 'seneste' ? 'Seneste aktivitet' : 'Navn'}</T>
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <Icon name="chevron-right" size={16} />
        </View>
      </Pressable>
    </View>
  );
}

export const matches = (name: string, query: string) => name.toLocaleLowerCase('da').includes(query.trim().toLocaleLowerCase('da'));

/** Faner med grøn streg under den valgte (Dine grupper / Din aktivitet) */
export function MoreTabs<V extends string>({ label, tabs, value, onChange }: { label: string; tabs: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel={label}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t.value)} style={s.tab}>
            <T style={s.tabText} c={on ? color.textPrimary : color.textSecondary}>
              {t.label}
            </T>
            <View style={[s.tabLine, on && { backgroundColor: color.accentHighlight }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Stiplet felt "Tilføj billede". Viser det valgte billede. */
export function PhotoPicker({ value, onPick, onRemove }: { value?: string | null; onPick: () => void; onRemove: () => void }) {
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? 'Skift billede' : 'Tilføj billede'}
        onPress={onPick}
        style={[s.drop, !!value && { borderStyle: 'solid' }]}
      >
        {value ? (
          <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Valgt billede" />
        ) : (
          <View style={s.hint}>
            <Icon name="plus" />
            <T v="label" c={color.textSecondary}>
              Tilføj billede
            </T>
          </View>
        )}
      </Pressable>
      {!!value && (
        <Pressable accessibilityRole="button" accessibilityLabel="Fjern billede" onPress={onRemove} style={s.remove}>
          <Icon name="close" size={20} />
        </Pressable>
      )}
    </View>
  );
}

/** To valg side om side ("Lukket" / "Åben"). Det valgte er hvidt med kant og fed tekst. */
export function ChoicePair<V extends string>({ options, value, onChange, label }: { options: readonly { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  return (
    <View style={s.choice} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[s.choiceItem, on && s.choiceOn]}
          >
            <T style={on ? s.choiceTextOn : s.choiceText} c={on ? color.textPrimary : color.textSecondary}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** .more-card: hvidt kort med kant */
export function MoreCard({ children, style, onPress, label }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string }) {
  if (onPress)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.8 }]}>
        {children}
      </Pressable>
    );
  return (
    <View style={[s.card, style]} accessibilityLabel={label}>
      {children}
    </View>
  );
}

const weekdays = ['Søn.', 'Man.', 'Tir.', 'Ons.', 'Tor.', 'Fre.', 'Lør.'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "I dag", "I går", "Man." eller "12. nov." */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'I dag';
  if (days === 1) return 'I går';
  if (days < 7) return weekdays[d.getDay()]!;
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

/** "for 5 min. siden", "for 2 t. siden" eller "i går"/"man." – til "Du skrev …" og "Nyt opslag …" */
export function whenText(iso: string, now = new Date()) {
  const min = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 60000);
  const label = dayLabel(iso, now);
  if (label === 'I dag') return min < 1 ? 'lige nu' : min < 60 ? `for ${Math.floor(min)} min. siden` : `for ${Math.floor(min / 60)} t. siden`;
  return label === 'I går' ? 'i går' : label.toLocaleLowerCase('da');
}

/** Seneste aktivitet til rækkerne: "Nyt opslag for 2 t. siden", "I går", "Man." (ingen opslag: "Oprettet i går") */
export function activityMeta(lastPost: string | null, createdAt?: string) {
  if (!lastPost) return createdAt ? `Oprettet ${whenText(createdAt)}` : 'Ingen opslag endnu';
  const label = dayLabel(lastPost);
  return label === 'I dag' ? `Nyt opslag ${whenText(lastPost)}` : label;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  scroll: { flex: 1 },
  content: { gap: 16, paddingTop: 4, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg },
  rowText: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.accentHighlight },
  sort: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: TAP },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 22, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  tab: { alignItems: 'center', justifyContent: 'flex-end', gap: 8, minHeight: TAP, paddingTop: 8 },
  tabText: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  tabLine: { alignSelf: 'stretch', height: 3, borderRadius: 2 },
  drop: {
    height: 120,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    borderRadius: radius.xl,
    backgroundColor: color.bgSubtle,
  },
  hint: { alignItems: 'center', gap: 6 },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bgSurface,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  choice: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  choiceItem: { flex: 1, minWidth: 0, height: 44, borderWidth: 1, borderColor: 'transparent', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: color.bgSurface, borderColor: color.borderDefault },
  choiceText: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  choiceTextOn: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20 },
  card: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.xl,
    backgroundColor: color.bgSurface,
  },
});
