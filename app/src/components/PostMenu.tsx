import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, radius } from '@/theme/tokens';
import { Button } from './Button';
import { MintTile } from './CreateFlow';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Forklaringen bag "Hvorfor ser jeg …?" */
  why: string;
  /** Eget indhold: ingen "Ikke interesseret" / "Anmeld" */
  mine?: boolean;
  onHide: () => void;
  onReport?: () => void;
  /** Offentlig debat: fællesskabsnoter for opslaget */
  onNotes?: () => void;
  /** Offentlig debat: skjul alle opslag fra afsenderen i debatten (fornavn i teksten) */
  onMute?: () => void;
  muteName?: string;
  /** Eget opslag: slet (spørger først) */
  onDelete?: () => void;
  /** Opslag eller flick (bruges i teksterne) */
  noun?: 'opslag' | 'flick';
};

type Row = { icon: IconName; label: string; hint?: string; onPress: () => void; next?: boolean };

/**
 * Menuen bag ⋯ på opslag og flicks. Samme udtryk som oprettelsen:
 * mint ikonfelter i et afrundet kort, og Anmeld/Slet for sig selv nederst i rødt.
 */
export function PostMenu({ open, onClose, why, mine = false, onHide, onReport, onNotes, onMute, muteName, onDelete, noun = 'opslag' }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'menu' | 'why' | 'delete'>('menu');
  const close = () => {
    setStep('menu');
    onClose();
  };
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const it = noun === 'flick' ? 'flicken' : 'opslaget';
  const whyTitle = `Hvorfor ser jeg ${noun === 'flick' ? 'denne flick' : 'dette opslag'}?`;

  const rows: Row[] = [
    { icon: 'info', label: whyTitle, onPress: () => setStep('why'), next: true },
    ...(!mine ? [{ icon: 'eye-off' as const, label: 'Ikke interesseret', hint: `Du ser færre ${noun === 'flick' ? 'flicks' : 'opslag'} som dette`, onPress: run(onHide) }] : []),
    ...(onNotes ? [{ icon: 'note' as const, label: 'Fællesskabsnoter', hint: 'Se eller skriv en note med kontekst', onPress: run(onNotes), next: true }] : []),
    ...(!mine && onMute ? [{ icon: 'mute' as const, label: `Skjul ${muteName ?? 'afsender'} i debatten`, hint: 'Du kan altid fortryde i Indstillinger', onPress: run(onMute) }] : []),
  ];
  const danger: Row | null =
    !mine && onReport
      ? { icon: 'flag', label: `Anmeld ${noun === 'flick' ? 'flick' : 'opslag'}`, hint: 'Anonymt. Fortæl os, hvad der er galt', onPress: run(onReport), next: true }
      : mine && onDelete
        ? { icon: 'close', label: `Slet ${noun === 'flick' ? 'flick' : 'opslag'}`, hint: 'Du bliver spurgt først', onPress: () => setStep('delete') }
        : null;

  return (
    <Sheet open={open} onClose={close} dim initialSize="auto">
      <View style={[s.wrap, { paddingBottom: 16 + insets.bottom }]}>
        {step === 'menu' && (
          <>
            <View style={s.card}>
              {rows.map((r, i) => (
                <MenuRow key={r.label} row={r} first={i === 0} />
              ))}
            </View>
            {danger && (
              <View style={s.card}>
                <MenuRow row={danger} first danger />
              </View>
            )}
          </>
        )}

        {step === 'why' && (
          <View style={s.panel}>
            <MintTile icon="info" size={48} />
            <T v="headingM" accessibilityRole="header">
              {whyTitle}
            </T>
            <T v="body">{why}</T>
            <T v="caption" c={color.textSecondary}>
              ciircle viser kun opslag fra dem, du følger, dine grupper, sider og de emner, du selv har valgt. Vi bruger ikke din adfærd andre steder.
            </T>
            <View style={s.buttons}>
              <Button variant="secondary" icon="chevron-left" onPress={() => setStep('menu')} style={{ flex: 1 }}>
                Tilbage
              </Button>
              <Button variant="accent" onPress={close} style={{ flex: 1, minHeight: 48 }}>
                OK
              </Button>
            </View>
          </View>
        )}

        {step === 'delete' && onDelete && (
          <View style={s.panel}>
            <MintTile icon="close" size={48} tone="danger" />
            <T v="headingM" accessibilityRole="header">
              Slet {it}?
            </T>
            <T v="bodyS" c={color.textSecondary}>
              {it.charAt(0).toUpperCase() + it.slice(1)} forsvinder for alle, også likes og kommentarer. Det kan ikke fortrydes.
            </T>
            <View style={s.buttons}>
              <Button variant="secondary" onPress={() => setStep('menu')} style={{ flex: 1 }}>
                Annullér
              </Button>
              <Pressable accessibilityRole="button" onPress={run(onDelete)} style={({ pressed }) => [s.delete, pressed && { opacity: 0.85 }]}>
                <T style={s.deleteText} c={color.white}>
                  Slet
                </T>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Sheet>
  );
}

function MenuRow({ row, first, danger }: { row: Row; first?: boolean; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.hint ? `${row.label}. ${row.hint}` : row.label}
      onPress={row.onPress}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}
    >
      <View style={{ alignSelf: 'center' }}>
        <MintTile icon={row.icon} tone={danger ? 'danger' : 'mint'} />
      </View>
      <View style={[s.rowText, !first && s.line]}>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <T style={s.label} c={danger ? color.danger : color.textPrimary}>
            {row.label}
          </T>
          {!!row.hint && (
            <T v="caption" c={color.textSecondary}>
              {row.hint}
            </T>
          )}
        </View>
        {row.next && <Icon name="chevron-right" size={18} color={color.textSecondary} />}
      </View>
    </Pressable>
  );
}

/** Enkel række (bruges af andre menuer, fx brugere og begivenheder) */
export function Item({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const c = danger ? color.danger : color.textPrimary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.item, pressed && { backgroundColor: color.bgSubtle }]}>
      <Icon name={icon} color={c} />
      <T c={c} style={s.itemText}>
        {label}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 6, paddingHorizontal: 16 },
  card: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingLeft: 14 },
  rowText: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingVertical: 10, paddingRight: 14 },
  line: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  label: { fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20 },
  panel: { gap: 10, paddingTop: 8, paddingHorizontal: 4 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  delete: { flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: color.danger, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 8, borderRadius: radius.md },
  itemText: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22 },
});
