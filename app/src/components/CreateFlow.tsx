import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INK, useDarkChrome } from '@/lib/useDarkChrome';
import { color, font, radius, TAP } from '@/theme/tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { T } from './T';

/*
 * Fælles ramme for at oprette opslag, flicks og moments.
 * Samme udtryk som forsiden og oprettelsen af en konto: runde knapper, trin-bjælke,
 * grøn trin-tekst, store overskrifter, mint ikonfelter og én stor grøn knap nederst.
 */

export type CreateKind = 'opslag' | 'flick' | 'moment';

const kinds: { value: CreateKind; label: string; to: '/opret' | '/flicks/ny' | '/ny-moment' }[] = [
  { value: 'opslag', label: 'Opslag', to: '/opret' },
  { value: 'flick', label: 'Flick', to: '/flicks/ny' },
  { value: 'moment', label: 'Moment', to: '/ny-moment' },
];

type ShellProps = {
  /** Hvilken slags der oprettes. Vises som skifter øverst, når `switchable` er sat. */
  kind: CreateKind;
  switchable?: boolean;
  /** [nuværende trin, antal trin] */
  progress?: [number, number];
  kicker?: string;
  title: string;
  /** Lille forklaring under overskriften */
  lead?: string;
  /** Luk (X) eller tilbage (‹) øverst til venstre */
  onClose: () => void;
  closeIcon?: 'close' | 'chevron-left';
  closeLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function CreateShell({ kind, switchable, progress, kicker, title, lead, onClose, closeIcon = 'close', closeLabel = 'Luk', footer, children }: ShellProps) {
  useDarkChrome();
  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={({ pressed }) => [s.round, pressed && { opacity: 0.6 }]}>
              <Icon name={closeIcon} color={color.textPrimary} />
            </Pressable>
            {switchable ? (
              <View style={s.switch} accessibilityRole="tablist" accessibilityLabel="Hvad vil du oprette?">
                {kinds.map((k) => {
                  const on = k.value === kind;
                  return (
                    <Pressable
                      key={k.value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      onPress={() => !on && router.replace(k.to)}
                      style={[s.switchItem, on && s.switchOn]}
                    >
                      <T v="label" c={on ? color.textPrimary : color.textSecondary}>
                        {k.label}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            ) : progress ? (
              <View style={s.progress} accessibilityLabel={`Trin ${progress[0]} af ${progress[1]}`}>
                {Array.from({ length: progress[1] }, (_, i) => (
                  <View key={i} style={[s.seg, i < progress[0] && s.segOn]} />
                ))}
              </View>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <View style={s.head}>
              {!!kicker && (
                <T v="captionStrong" c={color.green700}>
                  {kicker}
                </T>
              )}
              <T v="titleXl" style={s.title} accessibilityRole="header">
                {title}
              </T>
              {!!lead && (
                <T v="bodyS" c={color.textSecondary}>
                  {lead}
                </T>
              )}
            </View>
            {children}
          </ScrollView>
          {footer && <View style={s.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Mint ikonfelt, præcis som punkterne på forsiden (40 px, hjørner 12, grøn kant) */
export function MintTile({ icon, size = 40, tone = 'mint' }: { icon: IconName; size?: 40 | 48; tone?: 'mint' | 'danger' }) {
  return (
    <View style={[s.tile, tone === 'danger' && s.tileDanger, { width: size, height: size }]} accessible={false}>
      <Icon name={icon} size={size === 48 ? 22 : 18} color={tone === 'danger' ? color.danger : color.green700} />
    </View>
  );
}

type OptionProps = {
  icon: IconName;
  title: string;
  text?: string;
  /** Valgt (radio) – viser grøn markering */
  on?: boolean;
  role?: 'radio' | 'button' | 'switch';
  onPress: () => void;
  /** Noget til højre i stedet for valg-markeringen (fx en kontakt) */
  right?: ReactNode;
};

/** Én række med mint ikonfelt, titel og forklaring. Bruges til alle valg i oprettelsen. */
export function OptionRow({ icon, title, text, on, role = 'button', onPress, right }: OptionProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: !!on } : role === 'switch' ? { checked: !!on } : undefined}
      accessibilityLabel={text ? `${title}. ${text}` : title}
      onPress={onPress}
      style={({ pressed }) => [s.option, on && role === 'radio' && s.optionOn, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      <MintTile icon={icon} />
      <View style={s.optionText}>
        <T v="headingS">{title}</T>
        {!!text && (
          <T v="caption" c={color.textSecondary}>
            {text}
          </T>
        )}
      </View>
      {right ??
        (role === 'radio' ? (
          <View style={[s.check, on && s.checkOn]}>{on && <Icon name="check" size={14} color={color.ink900} stroke={2.5} />}</View>
        ) : (
          <Icon name="chevron-right" size={20} color={color.textSecondary} />
        ))}
    </Pressable>
  );
}

/** Halv-bred knap med mint ikonfelt, fx "Billede" og "Video" */
export function AddTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.add, pressed && { transform: [{ scale: 0.98 }] }]}>
      <MintTile icon={icon} />
      <T v="headingS">{label}</T>
    </Pressable>
  );
}

/** Til/fra-kontakt i oprettelsen (grøn, når den er slået til) */
export function FlowSwitch({ on }: { on: boolean }) {
  return (
    <View style={[s.switchTrack, on && s.switchTrackOn]}>
      <View style={[s.knob, on && { transform: [{ translateX: 20 }] }]} />
    </View>
  );
}

/** Overskrift for en gruppe af valg, fx "Hvor skal det deles?" */
export function CreateLabel({ children }: { children: string }) {
  return (
    <T v="label" c={color.textSecondary} style={s.label} accessibilityRole="header">
      {children}
    </T>
  );
}

/** Ramme om det valgte billede/den valgte video, med en knap til at fjerne/skifte det */
export function MediaFrame({ children, ratio = 4 / 5, width = 200, onRemove, removeLabel = 'Fjern' }: { children: ReactNode; ratio?: number; width?: number; onRemove?: () => void; removeLabel?: string }) {
  return (
    <View style={s.mediaWrap}>
      <View style={[s.media, { width, aspectRatio: ratio }]}>
        {children}
        {onRemove && (
          <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} onPress={onRemove} style={s.mediaRemove} hitSlop={6}>
            <Icon name="close" size={16} color={color.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Den store grønne knap nederst – den samme som "Fortsæt"/"Opret konto" */
export function CreateButton({ children, onPress, disabled, loading }: { children: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return <Button title={children} variant="accent" block disabled={disabled} loading={loading} onPress={onPress} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, minHeight: TAP + 8 },
  round: {
    width: TAP,
    height: TAP,
    flexShrink: 0,
    borderRadius: TAP / 2,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switch: { flex: 1, flexDirection: 'row', gap: 2, padding: 3, borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  switchItem: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  switchOn: { backgroundColor: color.accentVerifiedBg },
  progress: { flex: 1, flexDirection: 'row', gap: 6, paddingRight: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.gray200 },
  segOn: { backgroundColor: color.accent },
  body: { padding: 24, paddingTop: 20, gap: 16 },
  head: { gap: 6, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 8 },
  tile: {
    flexShrink: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.noteBg,
    borderWidth: 1,
    borderColor: color.accentBg,
  },
  tileDanger: { backgroundColor: '#fdeeee', borderColor: '#f7cfcf' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  optionOn: { borderColor: color.accent, borderWidth: 1.5, paddingHorizontal: 13.5 },
  add: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  optionText: { flex: 1, minWidth: 0, gap: 1 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { borderColor: color.accent, backgroundColor: color.accent },
  label: { marginTop: 6, marginBottom: -6 },
  switchTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: color.actionOff, flexShrink: 0 },
  switchTrackOn: { backgroundColor: color.accent },
  knob: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: color.bgSurface },
  mediaWrap: { alignSelf: 'stretch', alignItems: 'center' },
  media: { maxWidth: '100%', overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.ink900 },
  mediaRemove: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});

/** Stort tekstfelt i oprettelsen: hvidt, runde hjørner, grøn kant ved fokus */
export const createField = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    minHeight: 140,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  focus: { borderColor: color.accent, borderWidth: 1.5, paddingHorizontal: 17.5 },
});
