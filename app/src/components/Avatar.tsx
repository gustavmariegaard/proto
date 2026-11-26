import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { color } from '@/theme/tokens';
import { T } from './T';

const sizes = { S: 24, M: 40, L: 56, XL: 96 } as const;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

/** Profilbillede, eller initialer på grøn/grå baggrund */
export function Avatar({ name, path, uri, size = 'M' }: { name: string; path?: string | null; uri?: string; size?: keyof typeof sizes }) {
  const d = sizes[size];
  const src = uri ? { uri } : imageSource(path);
  return (
    <View style={[s.base, { width: d, height: d, borderRadius: d / 2 }]} accessible={false}>
      {src ? (
        <Image source={src} style={{ width: d, height: d }} contentFit="cover" transition={150} />
      ) : (
        <T v={size === 'XL' ? 'titleL' : size === 'S' ? 'micro' : 'label'} c={color.green700}>
          {initials(name)}
        </T>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: color.green200, alignItems: 'center', justifyContent: 'center' },
});
