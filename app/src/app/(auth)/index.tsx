import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { CircleBackdrop } from '@/components/CircleBackdrop';
import { T } from '@/components/T';
import { INK, useDarkChrome } from '@/lib/useDarkChrome';
import { color, font, radius } from '@/theme/tokens';

const points: { icon: IconName; title: string; text: string }[] = [
  { icon: 'sliders', title: 'Dit feed. Dine regler.', text: 'Du bestemmer, hvad du ser.' },
  { icon: 'lock', title: 'Dine data bliver i EU.', text: 'Gemt på servere i Europa.' },
  { icon: 'circles', title: 'Fakta på bordet.', text: 'Fællesskabet tilføjer kontekst.' },
];


/** Landingsside: mørk, med et levende grønt netværk bag */
export default function Landing() {
  useDarkChrome();
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <CircleBackdrop />
      <SafeAreaView style={s.safe}>
        <T v="titleXl" c={color.white} style={s.logo} accessibilityRole="header">
          ciircle
        </T>

        <View style={s.hero}>
          <T v="titleXl" c={color.white} style={s.headline}>
            Det sociale netværk for dem, du kender.
          </T>
          <T v="body" c="rgba(255,255,255,0.72)">
            Et netværk for rigtige mennesker i Europa.
          </T>
          <View style={s.points}>
            {points.map((p) => (
              <View key={p.text} style={s.point}>
                <View style={s.tile}>
                  <Icon name={p.icon} size={18} color={color.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="headingS" c={color.white} style={{ fontSize: 16 }}>
                    {p.title}
                  </T>
                  <T v="caption" c="rgba(255,255,255,0.6)">
                    {p.text}
                  </T>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/opret-konto')}
            style={({ pressed }) => [s.primary, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
          >
            <T v="label" c={INK} style={s.btnText}>
              Opret konto
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/log-ind')}
            style={({ pressed }) => [s.secondary, pressed && { opacity: 0.7 }]}
          >
            <T v="label" c={color.white} style={s.btnText}>
              Log ind
            </T>
          </Pressable>
          <T v="caption" c="rgba(255,255,255,0.55)" style={{ textAlign: 'center' }}>
            Når du fortsætter, accepterer du{' '}
            <T v="captionStrong" c={color.white} onPress={() => router.push('/privatliv')} style={{ textDecorationLine: 'underline' }}>
              privatlivserklæringen
            </T>
            .
          </T>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  safe: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  logo: { fontSize: 34, lineHeight: 40, marginTop: 12 },
  hero: { flex: 1, justifyContent: 'center', gap: 14 },
  headline: { fontSize: 40, lineHeight: 44, letterSpacing: -1, fontFamily: font.title },
  points: { gap: 16, marginTop: 18 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33,241,168,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(33,241,168,0.35)',
  },
  actions: { gap: 12 },
  primary: { height: 54, borderRadius: radius.pill, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  secondary: {
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 16 },
});
