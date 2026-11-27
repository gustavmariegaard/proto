import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ListingGrid } from '@/components/ListingCard';
import { ListingRadiusSheet } from '@/components/ListingRadiusSheet';
import { MarketEventsShell } from '@/components/MarketEventsShell';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import {
  listingsNear,
  locationOrDefault,
  myListings,
  radiusText,
  recentCategories,
  relatedFirst,
  savedListings,
  type Category,
  type ListingRow,
  type MyLocation,
} from '@/lib/market';
import { useMe } from '@/lib/session';
import { color, radius, TAP } from '@/theme/tokens';

type View_ = 'salg' | 'dine' | 'gemte';
const views: { value: View_; label: string }[] = [
  { value: 'salg', label: 'Til salg' },
  { value: 'dine', label: 'Dine annoncer' },
  { value: 'gemte', label: 'Gemte' },
];

const RADIUS_KEY = 'ciircle.torvet.radius';

/** Torvet: køb og sælg i nærheden (prototypens Market) */
export default function Market() {
  const me = useMe();
  const params = useLocalSearchParams<{ vis?: string }>();
  const [view, setView] = useState<View_>(views.find((v) => v.value === params.vis)?.value ?? 'salg');
  const [loc, setLoc] = useState<MyLocation | null>(null);
  const [km, setKm] = useState<number | null>(25);
  const [all, setAll] = useState<ListingRow[] | null>(null);
  const [recent, setRecent] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [radiusOpen, setRadiusOpen] = useState(false);

  useEffect(() => {
    if (params.vis === 'dine' || params.vis === 'gemte' || params.vis === 'salg') setView(params.vis);
  }, [params.vis]);

  // Husk den valgte afstand på telefonen
  useEffect(() => {
    AsyncStorage.getItem(RADIUS_KEY).then((v) => v !== null && setKm(v === 'alle' ? null : Number(v)));
    locationOrDefault(me.id).then(setLoc);
  }, [me.id]);

  const load = useCallback(async () => {
    if (view === 'dine') return setAll(await myListings(me.id));
    if (view === 'gemte') return setAll(await savedListings(me.id));
    if (!loc) return;
    const [rows, cats] = await Promise.all([listingsNear(loc, km), recentCategories()]);
    // Dine egne annoncer ligger under "Dine annoncer"
    setAll(rows.filter((l) => l.seller_id !== me.id));
    setRecent(cats);
  }, [view, loc, km, me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const applyKm = (v: number | null) => {
    setKm(v);
    AsyncStorage.setItem(RADIUS_KEY, v === null ? 'alle' : String(v));
  };

  const q = query.trim().toLowerCase();
  const shown = (all ?? []).filter((l) => view !== 'salg' || !q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.category.toLowerCase().includes(q));
  // Uden søgning: annoncer i det, du senest har kigget på, først
  const { forYou, rest } = view === 'salg' && !q ? relatedFirst(shown, recent) : { forYou: [] as ListingRow[], rest: shown };
  const city = loc?.city ?? '';

  const empty =
    view === 'dine'
      ? 'Du har ingen annoncer endnu. Har du noget, du vil sælge?'
      : view === 'gemte'
        ? 'Du har ikke gemt nogen annoncer. Tryk på Gem på en annonce for at finde den her.'
        : 'Ingen annoncer matcher din søgning.';

  return (
    <MarketEventsShell onRefresh={load}>
      <View style={s.market}>
        <View style={s.header}>
          <T v="titleXl" accessibilityRole="header">
            Torvet
          </T>
          <Button title="Sælg noget" icon="plus" onPress={() => router.push('/torvet/saelg')} style={s.sell} />
        </View>

        <SegmentedControl label="Vis annoncer" options={views} value={view} onChange={(v) => (setAll(null), setView(v))} />

        {view === 'salg' && (
          <View style={s.filters}>
            <View style={{ alignSelf: 'stretch' }}>
              <TextField label="Søg på Torvet" showLabel={false} value={query} onChangeText={setQuery} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Afstand: ${km === null ? 'hele landet' : `inden for ${km} km`} fra ${city}. Skift`}
              onPress={() => setRadiusOpen(true)}
              style={({ pressed }) => [s.radius, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Icon name="pin" size={18} />
              <T v="label">{radiusText(km)}</T>
              <Icon name="chevron-down" size={16} color={color.textSecondary} />
            </Pressable>
          </View>
        )}

        {all === null ? null : shown.length === 0 ? (
          <View style={s.empty}>
            <T v="bodyS" c={color.textSecondary}>
              {empty}
            </T>
            {view === 'dine' && <Button title="Sælg noget" variant="secondary" onPress={() => router.push('/torvet/saelg')} />}
          </View>
        ) : forYou.length > 0 ? (
          <>
            <View style={s.section}>
              <T v="headingM" accessibilityRole="header">
                Til dig
              </T>
              <ListingGrid items={forYou} />
            </View>
            {rest.length > 0 && (
              <View style={s.section}>
                <T v="headingM" accessibilityRole="header">
                  Mere på Torvet
                </T>
                <ListingGrid items={rest} />
              </View>
            )}
          </>
        ) : (
          <ListingGrid items={rest} mine={view === 'dine'} />
        )}
      </View>

      <ListingRadiusSheet open={radiusOpen} value={km} city={city} onClose={() => setRadiusOpen(false)} onApply={applyKm} />
    </MarketEventsShell>
  );
}

const s = StyleSheet.create({
  market: { gap: 14, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sell: { gap: 6, paddingLeft: 14 },
  filters: { alignItems: 'flex-start', gap: 10 },
  /* Afstand som pille: 📍 25 km ⌄ */
  radius: {
    minHeight: TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
  },
  section: { gap: 10 },
  empty: { alignItems: 'flex-start', gap: 12, paddingTop: 8, paddingBottom: 24 },
});
