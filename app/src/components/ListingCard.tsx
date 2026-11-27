import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { fmtKm, formatPrice, listedText, type ListingRow } from '@/lib/market';
import { color, radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/** Kort i Torvets gitter (prototypens .listing): forsidebillede, pris, titel og afstand (eller "Sat til salg …" for dine egne) */
export function ListingCard({ listing, mine }: { listing: ListingRow; mine?: boolean }) {
  const count = listing.image_paths.length;
  const sub = mine ? `Sat til salg ${listedText(listing.created_at).toLowerCase()}` : listing.distance_km !== null ? fmtKm(listing.distance_km) : listing.city;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}`}
      onPress={() => router.push(`/torvet/${listing.id}`)}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={s.media}>
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
      <View style={s.info}>
        <T v="headingM">{formatPrice(listing.price)}</T>
        <T v="bodyS" numberOfLines={2}>
          {listing.title}
        </T>
        <T v="caption" c={color.textSecondary}>
          {sub}
        </T>
      </View>
    </Pressable>
  );
}

/** Gitter med to kolonner (14 px mellem rækker, 12 px mellem kolonner). Kort i samme række er lige høje. */
export function ListingGrid({ items, mine }: { items: ListingRow[]; mine?: boolean }) {
  const rows: ListingRow[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={s.grid}>
      {rows.map((r) => (
        <View key={r[0]!.id} style={s.row}>
          {r.map((l) => (
            <View key={l.id} style={s.cell}>
              <ListingCard listing={l} mine={mine} />
            </View>
          ))}
          {r.length === 1 && <View style={s.cell} />}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden', borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg, backgroundColor: color.bgSurface },
  media: { width: '100%', aspectRatio: 1, backgroundColor: color.bgSubtle },
  count: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  info: { gap: 2, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 },
  grid: { gap: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  cell: { flex: 1, minWidth: 0 },
});
