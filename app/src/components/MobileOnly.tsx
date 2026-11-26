import QRCode from 'qrcode';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { CircleBackdrop } from './CircleBackdrop';
import { T } from './T';
import { color } from '@/theme/tokens';

const INK = '#0a0a0a';

/** Er vi på en telefon? (berøringsskærm og smal skærm). Kun relevant på web. */
function isPhone() {
  if (typeof window === 'undefined') return true;
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const shortest = Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight);
  return touch && shortest < 600;
}

/**
 * ciircle er en mobil-app. På web vises appen kun på telefoner;
 * på computer og tablet vises en side med en QR-kode til telefonen.
 */
export function MobileOnly({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState(() => Platform.OS !== 'web' || isPhone());
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const check = () => setPhone(isPhone());
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  if (phone) return <>{children}</>;
  return <DesktopNotice />;
}

function DesktopNotice() {
  const url = typeof window !== 'undefined' ? window.location.origin + window.location.pathname.replace(/[^/]*$/, '') : '';
  const qr = useMemo(() => QRCode.create(url, { errorCorrectionLevel: 'M' }).modules, [url]);
  const n = qr.size;
  const cell = 6;

  useEffect(() => {
    document.documentElement.style.backgroundColor = INK;
    document.body.style.backgroundColor = INK;
  }, []);

  return (
    <View style={s.root}>
      <CircleBackdrop />
      <View style={s.card}>
        <T v="titleXl" c={color.white} style={s.logo}>
          ciircle
        </T>
        <T v="titleXl" c={color.white} style={s.title} accessibilityRole="header">
          Lavet til din mobil.
        </T>
        <T v="body" c="rgba(255,255,255,0.7)" style={{ textAlign: 'center' }}>
          Scan koden med kameraet på din telefon.
        </T>
        <View style={s.qr} accessibilityLabel={`QR-kode til ${url}`}>
          <Svg width={n * cell} height={n * cell}>
            {Array.from({ length: n * n }, (_, i) =>
              qr.get(i % n, Math.floor(i / n)) ? <Rect key={i} x={(i % n) * cell} y={Math.floor(i / n) * cell} width={cell} height={cell} fill={INK} /> : null,
            )}
          </Svg>
        </View>
        <T v="caption" c="rgba(255,255,255,0.55)" selectable>
          {url.replace(/^https?:\/\//, '')}
        </T>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { alignItems: 'center', gap: 16, maxWidth: 420 },
  logo: { fontSize: 34, lineHeight: 40, marginBottom: 12 },
  title: { fontSize: 36, lineHeight: 42, letterSpacing: -0.8, textAlign: 'center' },
  qr: { padding: 18, borderRadius: 24, backgroundColor: color.white, marginTop: 8 },
});
