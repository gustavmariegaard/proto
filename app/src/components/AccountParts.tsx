import type { Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { PageHeader } from './PageHeader';
import { T } from './T';

/*
 * Byggeklodser til Indstillinger og Forældrekontrol – prototypens account.css
 * (.acc-screen, .acc-content, .acc-card, .acc-panel, .set-row, .set-person).
 */

/** .acc-screen + .acc-content: sidehoved og indhold, der ruller (padding 4/20/24, 14 px mellemrum) */
export function AccScreen({
  title,
  fallback = '/indstillinger',
  right,
  footer,
  gap = 14,
  children,
}: {
  title: string;
  fallback?: Href;
  right?: ReactNode;
  /** Fast nederst, fx SaveBar */
  footer?: ReactNode;
  gap?: number;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      <PageHeader title={title} fallback={fallback}>
        {right}
      </PageHeader>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { gap, paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

/** Række i Indstillinger (.acc-card.set-row): ikon i grå firkant, titel, hint og pil */
export function SetRow({ icon, title, hint, onPress }: { icon: IconName; title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
      <View style={s.icon}>
        <Icon name={icon} size={20} />
      </View>
      <View style={s.text}>
        <T v="headingS">{title}</T>
        <T v="caption" c={color.textSecondary}>
          {hint}
        </T>
      </View>
      <Icon name="chevron-right" />
    </Pressable>
  );
}

/** .acc-card: hvid række med kant (radius 18) */
export function AccCard({ children, style, onPress, label }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string }) {
  if (onPress)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.8 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

/** .acc-panel: større kort (radius 22, padding 16) */
export function AccPanel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

/** Person med én knap (blokerede og skjulte i debatten): .set-person */
export function PersonAction({ name, username, avatar, action, onAction, onOpen }: { name: string; username: string; avatar: string | null; action: string; onAction: () => void; onOpen?: () => void }) {
  return (
    <View style={[s.card, s.person]}>
      <Pressable accessibilityRole={onOpen ? 'link' : undefined} disabled={!onOpen} onPress={onOpen} style={s.who}>
        <Avatar name={name} path={avatar} />
        <View style={s.text}>
          <T v="headingS" numberOfLines={1}>
            {name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={1}>
            @{username}
          </T>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [s.personBtn, pressed && { opacity: 0.7 }]}>
        <T v="label">{action}</T>
      </Pressable>
    </View>
  );
}

/** Kladde: ændringer gemmes først, når man trykker "Gem ændringer" (prototypens useDraft) */
export function useDraft<V>(saved: V) {
  const [draft, setDraft] = useState<V>(saved);
  const [toast, setToast] = useState(false);
  const savedKey = JSON.stringify(saved);
  // Når de gemte værdier er hentet/ændret, følger kladden med
  useEffect(() => {
    setDraft(JSON.parse(savedKey) as V);
  }, [savedKey]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 1800);
    return () => clearTimeout(t);
  }, [toast]);
  return {
    draft,
    patch: (p: Partial<V>) => setDraft((d) => ({ ...d, ...p })),
    dirty: JSON.stringify(draft) !== savedKey,
    reset: () => setDraft(JSON.parse(savedKey) as V),
    saved: () => setToast(true),
    toast,
  };
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { paddingTop: 4, paddingHorizontal: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  panel: {
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.xl,
    backgroundColor: color.bgSurface,
  },
  person: { paddingVertical: 8, paddingRight: 8, paddingLeft: 12 },
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personBtn: {
    minHeight: TAP,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.pill,
  },
});
