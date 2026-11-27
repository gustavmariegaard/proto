import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { formatPrice, listingSummary } from '@/lib/market';
import { color, radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

type Summary = Awaited<ReturnType<typeof listingSummary>>;
const cache = new Map<string, Summary>();

/**
 * Lille annoncekort i en samtale fra Torvet (prototypens ListingContext): billede, titel og pris.
 * inBubble = inde i en beskedboble (mine = din egen, mørk boble). Tryk åbner annoncen.
 */
export function ListingContext({ listingId, inBubble, mine }: { listingId: string; inBubble?: boolean; mine?: boolean }) {
  const [l, setL] = useState<Summary | undefined>(cache.get(listingId));
  useEffect(() => {
    if (cache.has(listingId)) return;
    listingSummary(listingId).then((d) => {
      cache.set(listingId, d);
      setL(d);
    });
  }, [listingId]);

  const gone = l === null || (l && l.sold);
  const dark = inBubble && mine;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={l && !gone ? `Annonce: ${l.title}, ${formatPrice(l.price)}` : 'Annonce'}
      disabled={!l || !!gone}
      onPress={() => l && router.push(`/torvet/${l.id}`)}
      style={[s.card, inBubble ? [s.inBubble, dark && s.dark] : s.top]}
    >
      <View style={s.img}>
        {l && !gone ? <Image source={imageSource(l.image_paths[0])} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="shop" size={18} color={color.textSecondary} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label" c={dark ? color.textOnAction : color.textPrimary} numberOfLines={1}>
          {gone ? 'Annoncen er ikke længere til salg' : l ? l.title : ' '}
        </T>
        {l && !gone && (
          <T v="caption" c={dark ? 'rgba(255,255,255,0.7)' : color.textSecondary}>
            {formatPrice(l.price)}
          </T>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  /* .listing-ctx */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  top: { marginHorizontal: 12, marginBottom: 8 },
  inBubble: { marginBottom: 8, marginHorizontal: -8 },
  dark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.18)' },
  img: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
});
