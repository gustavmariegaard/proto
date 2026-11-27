import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, radius } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Forklaringen bag "Hvorfor ser jeg …?" */
  why: string;
  /** Eget indhold: ingen "Ikke interesseret" / "Rapportér" */
  mine?: boolean;
  onHide: () => void;
  onReport?: () => void;
  /** Offentlig debat: fællesskabsnoter for opslaget */
  onNotes?: () => void;
  /** Offentlig debat: skjul alle opslag fra afsenderen i debatten (fornavn i teksten) */
  onMute?: () => void;
  muteName?: string;
  /** Eget opslag: slet (findes ikke i prototypen, men er nødvendig i appen) */
  onDelete?: () => void;
  /** Opslag eller flick (bruges i teksterne) */
  noun?: 'opslag' | 'flick';
};

/** Menuen bag ⋯ på opslag og flicks: Hvorfor ser jeg dette?, Ikke interesseret og Rapportér. */
export function PostMenu({ open, onClose, why, mine = false, onHide, onReport, onNotes, onMute, muteName, onDelete, noun = 'opslag' }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'menu' | 'why'>('menu');
  const close = () => {
    setStep('menu');
    onClose();
  };
  const whyTitle = `Hvorfor ser jeg ${noun === 'flick' ? 'denne flick' : 'dette opslag'}?`;
  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  return (
    <Sheet open={open} onClose={close} title={step === 'why' ? whyTitle : noun === 'flick' ? 'Flick' : 'Opslag'} dim initialSize="auto">
      {step === 'why' ? (
        <View style={[s.why, { paddingBottom: 24 + insets.bottom }]}>
          <T v="body">{why}</T>
          <T v="caption" c={color.textSecondary}>
            ciircle viser kun opslag fra dem, du følger, dine grupper, sider og de emner, du selv har valgt. Vi bruger ikke din adfærd andre steder.
          </T>
          {/* Man skal altid kunne komme tilbage */}
          <View style={s.buttons}>
            <Pressable accessibilityRole="button" onPress={() => setStep('menu')} style={[s.btn, s.back]}>
              <Icon name="chevron-left" size={20} />
              <T style={s.btnText}>Tilbage</T>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={close} style={[s.btn, s.ok]}>
              <T style={s.btnText} c={color.textOnAction}>
                OK
              </T>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[s.list, { paddingBottom: 16 + insets.bottom }]}>
          <Item icon="info" label={whyTitle} onPress={() => setStep('why')} />
          {!mine && <Item icon="eye-off" label="Ikke interesseret" onPress={run(onHide)} />}
          {onNotes && <Item icon="note" label="Fællesskabsnoter" onPress={run(onNotes)} />}
          {!mine && onMute && <Item icon="mute" label={`Skjul ${muteName ?? 'afsender'} i debatten`} onPress={run(onMute)} />}
          {!mine && onReport && <Item icon="flag" label="Rapportér" danger onPress={run(onReport)} />}
          {mine && onDelete && <Item icon="close" label={noun === 'flick' ? 'Slet flick' : 'Slet opslag'} danger onPress={run(onDelete)} />}
        </View>
      )}
    </Sheet>
  );
}

/** Række i menuen (.post-menu__item) */
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
  list: { paddingTop: 8, paddingHorizontal: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 8, borderRadius: radius.md },
  itemText: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22 },
  why: { gap: 12, paddingTop: 16, paddingHorizontal: 20 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: radius.pill },
  back: { borderWidth: 1, borderColor: color.borderStrong },
  ok: { backgroundColor: color.actionPrimary },
  btnText: { fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20 },
});
