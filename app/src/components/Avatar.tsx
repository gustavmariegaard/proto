import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { color, font } from '@/theme/tokens';
import { T } from './T';

export type AvatarTone = 'sand' | 'blue' | 'sage' | 'rose';
export type AvatarSize = 'S' | 'M' | 'L' | 'XL';

/** S = 36, M = 44, L = 56 px (XL = 70 px, bruges i Moments) – som prototypens Avatar.css */
const sizes = { S: 36, M: 44, L: 56, XL: 70 } as const;
const fonts = {
  S: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 16 },
  M: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  L: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20 },
  XL: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20 },
} as const;
const tones = {
  sand: { bg: color.avatarSandBg, fg: color.avatarSandFg },
  blue: { bg: color.avatarBlueBg, fg: color.avatarBlueFg },
  sage: { bg: color.avatarSageBg, fg: color.avatarSageFg },
  rose: { bg: color.avatarRoseBg, fg: color.avatarRoseFg },
} as const;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

type Props = {
  name: string;
  /** Sti i Supabase Storage */
  path?: string | null;
  /** Lokalt billede eller fuld URL */
  uri?: string;
  /** S/M/L/XL som i prototypen, eller et antal px */
  size?: AvatarSize | number;
  tone?: AvatarTone;
};

/** Rund avatar: profilbillede, eller initialer på tonens baggrund */
export function Avatar({ name, path, uri, size = 'M', tone = 'sand' }: Props) {
  const d = typeof size === 'number' ? size : sizes[size];
  const f =
    typeof size === 'number'
      ? size <= 28
        ? { fontFamily: font.bodySemi, fontSize: 9, lineHeight: 12 }
        : size <= 40
          ? fonts.S
          : size <= 48
            ? fonts.M
            : size >= 90
              ? { fontFamily: font.title, fontSize: 22, lineHeight: 28 }
              : fonts.L
      : fonts[size];
  const t = tones[tone];
  const src = uri ? { uri } : imageSource(path);
  return (
    <View style={[s.base, { width: d, height: d, borderRadius: d / 2, backgroundColor: t.bg }]} accessible={false}>
      {src ? (
        <Image source={src} style={{ width: d, height: d }} contentFit="cover" transition={150} />
      ) : (
        <T c={t.fg} style={f}>
          {initials(name)}
        </T>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  base: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
