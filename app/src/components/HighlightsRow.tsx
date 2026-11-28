import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { highlightsFor, type Highlight } from '@/lib/moments';
import { color } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/**
 * Highlights som runde bobler (prototypens .pc-highlights): moments, man har gemt.
 * Egen profil: "Ny" først. Andres profil: skjult, hvis der ingen er.
 */
export function HighlightsRow({ userId, own }: { userId: string; own?: boolean }) {
  const [list, setList] = useState<Highlight[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      highlightsFor(userId).then(setList);
    }, [userId]),
  );
  if (!list || (!own && list.length === 0)) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.scroll}
      contentContainerStyle={s.row}
      accessibilityLabel="Highlights"
    >
      {own && (
        <Pressable accessibilityRole="link" accessibilityLabel="Ny highlight" onPress={() => router.push('/highlight/ny')} style={s.item}>
          <View style={[s.ring, s.ringNew]}>
            <Icon name="plus" />
          </View>
          <T v="caption" numberOfLines={1} style={s.title}>
            Ny
          </T>
        </Pressable>
      )}
      {list.map((h) => {
        const cover = h.cover?.media_path && h.cover.media_type === 'image' ? h.cover.media_path : null;
        return (
          <Pressable key={h.id} accessibilityRole="link" accessibilityLabel={`Afspil ${h.title}`} onPress={() => router.push(`/highlight/${h.id}`)} style={s.item}>
            {/* 64 px boble med 2 px lys kant og en 1,5 px grå ring udenom */}
            <View style={s.outer}>
              <View style={s.ring}>{cover ? <Image source={imageSource(cover)} style={s.img} contentFit="cover" /> : <Icon name="clip" />}</View>
            </View>
            <T v="caption" numberOfLines={1} style={s.title}>
              {h.title}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  row: { gap: 14, paddingTop: 2, paddingBottom: 4, paddingHorizontal: 20 },
  item: { width: 68, alignItems: 'center', gap: 6 },
  outer: { width: 67, height: 67, margin: -1.5, borderRadius: 34, borderWidth: 1.5, borderColor: color.borderStrong },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: color.bgApp,
    backgroundColor: color.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNew: { borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.bgSurface },
  img: { width: '100%', height: '100%' },
  title: { maxWidth: 68 },
});
