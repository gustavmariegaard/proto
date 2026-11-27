import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, radius } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { T } from './T';

/*
 * Fælles dele til Opret, Del, Rapportér og Noter (prototypens create/parts.tsx + .modal-screen).
 */

/** Går ét skridt tilbage, eller til `fallback`, hvis siden er åbnet direkte. */
export function closeTo(fallback: Href = '/') {
  return () => (router.canGoBack() ? router.back() : router.replace(fallback));
}

/** Sidehoved med luk-knap (X), titel og evt. en handling til højre. */
export function CloseHeader({ title, onClose, closeLabel = 'Luk', children }: { title: string; onClose: () => void; closeLabel?: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: layout.topGap + insets.top }]}>
      <IconButton icon="close" label={closeLabel} variant="outline" onPress={onClose} />
      <T v="titleL" style={s.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

/** .modal-screen: fuld skærm med sidehoved og indhold, der kan rulles (gap 14, 4 px 20 px 24 px) */
export function ModalScreen({ header, children, footer, contentStyle }: { header: ReactNode; children: ReactNode; footer?: ReactNode; contentStyle?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      {header}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 24 + (footer ? 0 : insets.bottom) }, contentStyle]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

/** Til/fra-kontakt, 48 × 28 px (prototypens .toggle) */
export function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <View style={[s.toggle, on && s.toggleOn]}>
      <View style={[s.knob, on && { transform: [{ translateX: 20 }] }]} />
    </View>
  );
}

export type SettingRow = { id: string; title: string; hint: string };

/** Kort med rækker af indstillinger, hver med en kontakt (prototypens ToggleList) */
export function ToggleList({ rows, values, onToggle }: { rows: SettingRow[]; values: Record<string, boolean>; onToggle: (id: string) => void }) {
  return (
    <View style={s.list}>
      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          accessibilityRole="switch"
          accessibilityState={{ checked: !!values[row.id] }}
          accessibilityLabel={row.title}
          onPress={() => onToggle(row.id)}
          style={[s.row, i > 0 && s.rowLine]}
        >
          <View style={s.rowText}>
            <T v="label">{row.title}</T>
            <T v="caption" c={color.textSecondary}>
              {row.hint}
            </T>
          </View>
          <ToggleSwitch on={!!values[row.id]} />
        </Pressable>
      ))}
    </View>
  );
}

/** Rund valgknap (prototypens RadioDot) */
export function RadioDot({ on, size = 24 }: { on: boolean; size?: 22 | 24 }) {
  return (
    <View style={[s.dot, { width: size, height: size, borderRadius: size / 2 }, on && s.dotOn]}>
      {on && <View style={{ width: (size - 4) / 2, height: (size - 4) / 2, borderRadius: size, backgroundColor: color.textPrimary }} />}
    </View>
  );
}

/** Valgbart kort (prototypens .choice): Send til, Rapportér */
export function Choice({ on, onPress, role = 'checkbox', label, children }: { on: boolean; onPress: () => void; role?: 'checkbox' | 'radio'; label?: string; children: ReactNode }) {
  return (
    <Pressable accessibilityRole={role} accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={[s.choice, on && s.choiceOn]}>
      {children}
    </Pressable>
  );
}

export const parts = StyleSheet.create({
  muted: { color: color.textSecondary },
  full: { alignSelf: 'stretch' },
  choiceText: { flex: 1, minWidth: 0, gap: 2 },
  choiceList: { alignSelf: 'stretch', gap: 14 },
});

const s = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: color.bgApp },
  title: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { alignItems: 'flex-start', gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: color.actionOff, flexShrink: 0 },
  toggleOn: { backgroundColor: color.actionPrimary },
  knob: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: color.bgSurface },
  list: { alignSelf: 'stretch', overflow: 'hidden', borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.xl, backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 14, paddingHorizontal: 16 },
  rowLine: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  dot: { flexShrink: 0, borderWidth: 2, borderColor: color.borderStrong, backgroundColor: color.bgSurface, alignItems: 'center', justifyContent: 'center' },
  dotOn: { borderColor: color.textPrimary },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  choiceOn: { backgroundColor: color.accentVerifiedBg, borderColor: color.accentVerifiedText },
});
