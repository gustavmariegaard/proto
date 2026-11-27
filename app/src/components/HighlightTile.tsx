import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import type { MomentCard } from '@/lib/moments';
import { color } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/** Et moment som billede i highlights (video: ikon på mørk bund, tekst: teksten) */
export function HighlightMedia({ m, dim }: { m: MomentCard; dim?: boolean }) {
  if (m.media_path && m.media_type === 'image') return <Image source={imageSource(m.media_path)} style={[StyleSheet.absoluteFill, dim && { opacity: 0.55 }]} contentFit="cover" />;
  return (
    <View style={[StyleSheet.absoluteFill, s.fallback, m.media_type === 'video' && m.media_path ? s.video : null, dim && { opacity: 0.55 }]}>
      {m.media_type === 'video' && m.media_path ? (
        <Icon name="clip" color={color.white} />
      ) : (
        <T v="caption" numberOfLines={5} style={{ textAlign: 'center' }}>
          {m.text || 'Delt opslag'}
        </T>
      )}
    </View>
  );
}

/** Forsiden er det første billede (samme regel som highlight-boblen på profilen) */
export const coverOf = (list: MomentCard[]) => (list.find((m) => m.media_path && m.media_type === 'image') ?? list[0])?.id;

const s = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: color.green200 },
  video: { backgroundColor: color.ink900 },
});
