import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { fmtKm, formatPrice, listedText, type ListingRow } from '@/lib/market';
import { color, radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/** Kort i Torvets gitter: forsidebillede, pris, titel og afstand (eller "Sat til salg …" for dine egne) */
export function ListingCard({ listing, mine, width }: { listing: ListingRow; mine?: boolean; width: number }) {
  const count = listing.image_paths.length;
  const sub = mine ? `Sat til salg ${listedText(listing.created_at).toLowerCase()}` : listing.distance_km !== null ? fmtKm(listing.distance_km) : listing.city;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}`}
      onPress={() => router.push(`/torvet/${listing.id}`)}
      style={({ pressed }) => [{ width, gap: 6 }, pressed && { opacity: 0.8 }]}
    >
      <View style={[s.media, { width, height: width }]}>
        <Image source={imageSource(listing.image_paths[0])} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        {count > 1 && (
          <View style={s.count}>
            <Icon name="image" size={12} color={color.white} />
            <T v="micro" c={color.white}>
              1/{count}
            </T>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 2 }}>
        <T v="headingM">{formatPrice(listing.price)}</T>
        <T v="bodyS" numberOfLines={1}>
          {listing.title}
        </T>
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {sub}
        </T>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  media: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: color.bgSubtle },
  count: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
