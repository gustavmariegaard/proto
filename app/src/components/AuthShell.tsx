import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { INK, useDarkChrome } from '@/lib/useDarkChrome';
import { color, TAP } from '@/theme/tokens';
import { CircleBackdrop } from './CircleBackdrop';
import { Icon } from './Icon';
import { T } from './T';

type Props = {
  title?: string;
  /** Lille tekst over titlen, fx "Trin 1 af 3" */
  kicker?: string;
  /** Statusbjælke: [nuværende trin, antal trin] */
  progress?: [number, number];
  onBack?: (() => void) | false;
  children: ReactNode;
  footer?: ReactNode;
};

/** Fælles ramme for login-skærmene: mørk, med ringene fra landingssiden (dæmpet) */
export function AuthShell({ title, kicker, progress, onBack, children, footer }: Props) {
  useDarkChrome();
  const back = onBack === false ? null : onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}>
        <CircleBackdrop />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            {back && (
              <Pressable accessibilityRole="button" accessibilityLabel="Tilbage" onPress={back} style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}>
                <Icon name="chevron-left" color={color.textPrimary} />
              </Pressable>
            )}
            {progress && (
              <View style={s.progress} accessibilityLabel={`Trin ${progress[0]} af ${progress[1]}`}>
                {Array.from({ length: progress[1] }, (_, i) => (
                  <View key={i} style={[s.seg, i < progress[0] && s.segOn]} />
                ))}
              </View>
            )}
          </View>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            {kicker && (
              <T v="captionStrong" c={color.green700}>
                {kicker}
              </T>
            )}
            {title && (
              <T v="titleXl" c={color.textPrimary} style={s.title} accessibilityRole="header">
                {title}
              </T>
            )}
            {children}
          </ScrollView>
          {footer && <View style={s.footer}>{footer}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Tekstlink på mørk baggrund */
export function AuthLink({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={{ minHeight: TAP, justifyContent: 'center', alignSelf: 'center' }}>
      <T v="label" c={muted ? color.textSecondary : color.textPrimary} style={muted ? undefined : { textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Pressable>
  );
}

export const authText = { muted: color.textSecondary, faint: color.textSecondary, error: color.danger };

const s = StyleSheet.create({
  // overflow: ringene må ikke gøre siden bredere end skærmen (ellers ruller Safari sidelæns ved fokus)
  root: { flex: 1, backgroundColor: INK, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, minHeight: TAP + 8 },
  back: {
    width: TAP,
    height: TAP,
    borderRadius: TAP / 2,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flex: 1, flexDirection: 'row', gap: 6, paddingRight: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.gray200 },
  segOn: { backgroundColor: color.accent },
  body: { padding: 24, paddingTop: 20, gap: 18 },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, marginBottom: 6 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 4 },
});
