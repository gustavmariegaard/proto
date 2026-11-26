import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { formatPrice, listingSummary } from '@/lib/market';
import { color, radius, TAP } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

type Summary = Awaited<ReturnType<typeof listingSummary>>;
const cache = new Map<string, Summary>();

/** Annonce som kontekst i en samtale (øverst og på beskeder om annoncen). Tryk åbner annoncen. */
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
  const fg = inBubble && mine ? color.textOnAction : color.textPrimary;
  const sub = inBubble && mine ? 'rgba(255,255,255,0.7)' : color.textSecondary;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={l && !gone ? `Annonce: ${l.title}, ${formatPrice(l.price)}` : 'Annonce'}
      disabled={!l || !!gone}
      onPress={() => l && router.push(`/torvet/${l.id}`)}
      style={[s.card, inBubble ? (mine ? s.inMine : s.inTheirs) : s.top]}
    >
      <View style={s.thumb}>
        {l && !gone ? (
          <Image source={imageSource(l.image_paths[0])} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name="shop" size={18} color={color.textSecondary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <T v="captionStrong" c={sub}>
          Torvet
        </T>
        <T v="label" c={fg} numberOfLines={1}>
          {gone ? 'Annoncen er ikke længere til salg' : l ? l.title : ' '}
        </T>
        {l && !gone && (
          <T v="caption" c={sub}>
            {formatPrice(l.price)}
          </T>
        )}
      </View>
      {l && !gone && !inBubble && <Icon name="chevron-right" size={18} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TAP, padding: 8, borderRadius: radius.md },
  top: { marginHorizontal: 16, marginBottom: 4, backgroundColor: color.bgSubtle },
  inMine: { backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 6 },
  inTheirs: { backgroundColor: color.bgSurface, marginBottom: 6 },
  thumb: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: color.gray200, alignItems: 'center', justifyContent: 'center' },
});
