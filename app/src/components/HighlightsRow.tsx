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
 * Highlights under profilen: moments, man har gemt (som prototypens samlinger).
 * Egen profil: "Ny" først og langt tryk for at redigere. Andres profil: skjult, hvis der ingen er.
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} accessibilityLabel="Highlights">
      {own && (
        <Pressable accessibilityRole="button" accessibilityLabel="Ny highlight" onPress={() => router.push('/highlight/ny')} style={s.item}>
          <View style={[s.circle, s.add]}>
            <Icon name="plus" size={22} />
          </View>
          <T v="caption">Ny</T>
        </Pressable>
      )}
      {list.map((h) => (
        <Pressable
          key={h.id}
          accessibilityRole="button"
          accessibilityLabel={`Highlight: ${h.title}`}
          accessibilityHint={own ? 'Hold for at redigere' : undefined}
          onPress={() => router.push(`/highlight/${h.id}`)}
          onLongPress={own ? () => router.push({ pathname: '/highlight/ny', params: { id: h.id } }) : undefined}
          style={s.item}
        >
          <View style={s.circle}>
            {h.cover?.media_path && h.cover.media_type === 'image' ? (
              <Image source={imageSource(h.cover.media_path)} style={s.img} contentFit="cover" />
            ) : (
              <View style={[s.img, s.textCover]}>
                <Icon name={h.cover?.media_type === 'video' ? 'video' : 'star'} size={20} color={color.green700} />
              </View>
            )}
          </View>
          <T v="caption" numberOfLines={1} style={{ maxWidth: 72 }}>
            {h.title}
          </T>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { gap: 12, paddingVertical: 8 },
  item: { width: 72, alignItems: 'center', gap: 4 },
  circle: { width: 64, height: 64, borderRadius: 32, padding: 3, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  add: { borderStyle: 'dashed', backgroundColor: color.bgSurface },
  img: { width: 56, height: 56, borderRadius: 28 },
  textCover: { backgroundColor: color.green200, alignItems: 'center', justifyContent: 'center' },
});
