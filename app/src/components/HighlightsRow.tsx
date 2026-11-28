import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { highlightsFor, type Highlight } from '@/lib/moments';
import { color, momentRing } from '@/theme/tokens';
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
            {/* Samme størrelse og ring som stories på Hjem (78 px), grå ring */}
            <View style={s.ring}>
              <View style={s.pic}>{cover ? <Image source={imageSource(cover)} style={s.img} contentFit="cover" /> : <Icon name="clip" />}</View>
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

/** Som MomentBubble på Hjem */
const SIZE = 78;
const PIC = SIZE - 2 * (momentRing.width + momentRing.gap);

const s = StyleSheet.create({
  scroll: { marginHorizontal: -20, flexGrow: 0 },
  row: { gap: 6, paddingTop: 2, paddingBottom: 4, paddingHorizontal: 16 },
  item: { width: SIZE + 10, alignItems: 'center', gap: 4 },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: momentRing.width,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pic: { width: PIC, height: PIC, borderRadius: PIC / 2, overflow: 'hidden', backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  ringNew: { borderStyle: 'dashed', borderWidth: 2, borderColor: color.textSecondary },
  img: { width: '100%', height: '100%' },
  title: { width: SIZE + 10, textAlign: 'center' },
});
