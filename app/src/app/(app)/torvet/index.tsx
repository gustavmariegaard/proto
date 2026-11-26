import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ListingCard } from '@/components/ListingCard';
import { ListingLocationSheet } from '@/components/ListingLocationSheet';
import { ListingRadiusSheet } from '@/components/ListingRadiusSheet';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import {
  getMyLocation,
  listingsNear,
  myListings,
  radiusText,
  recentCategories,
  relatedFirst,
  saveMyLocation,
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

/** Torvet: køb og sælg i nærheden (som prototypen) */
export default function Market() {
  const me = useMe();
  const params = useLocalSearchParams<{ vis?: string }>();
  const [view, setView] = useState<View_>(views.find((v) => v.value === params.vis)?.value ?? 'salg');
  const [loc, setLoc] = useState<MyLocation | null | undefined>(undefined);
  const [km, setKm] = useState<number | null>(25);
  const [all, setAll] = useState<ListingRow[] | null>(null);
  const [recent, setRecent] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const { width } = useWindowDimensions();
  const cardW = Math.floor((Math.min(width, 600) - 40 - 12) / 2);

  useEffect(() => {
    if (params.vis === 'dine' || params.vis === 'gemte' || params.vis === 'salg') setView(params.vis);
  }, [params.vis]);

  // Husk den valgte afstand på telefonen
  useEffect(() => {
    AsyncStorage.getItem(RADIUS_KEY).then((v) => v !== null && setKm(v === 'alle' ? null : Number(v)));
    getMyLocation(me.id).then(setLoc);
  }, [me.id]);

  const load = useCallback(async () => {
    if (view === 'dine') return setAll(await myListings(me.id));
    if (view === 'gemte') return setAll(await savedListings(me.id));
    if (!loc) return setAll([]);
    const [rows, cats] = await Promise.all([listingsNear(loc, km), recentCategories()]);
    setAll(rows);
    setRecent(cats);
  }, [view, loc, km, me.id]);

  useFocusEffect(
    useCallback(() => {
      if (loc !== undefined) load();
    }, [load, loc]),
  );

  const pickLocation = async (l: MyLocation) => setLoc(await saveMyLocation(me.id, l));
  const applyKm = (v: number | null) => {
    setKm(v);
    AsyncStorage.setItem(RADIUS_KEY, v === null ? 'alle' : String(v));
  };

  const q = query.trim().toLowerCase();
  const shown = (all ?? []).filter((l) => !q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.category.toLowerCase().includes(q));
  const { forYou, rest } = view === 'salg' && !q ? relatedFirst(shown, recent) : { forYou: [] as ListingRow[], rest: shown };

  const grid = (items: ListingRow[]) => (
    <View style={s.grid}>
      {items.map((l) => (
        <ListingCard key={l.id} listing={l} mine={view === 'dine'} width={cardW} />
      ))}
    </View>
  );

  const empty =
    view === 'dine'
      ? 'Du har ingen annoncer endnu.'
      : view === 'gemte'
        ? 'Du har ikke gemt nogen annoncer.'
        : q
          ? 'Ingen annoncer matcher din søgning.'
          : 'Ingen annoncer i nærheden lige nu.';

  return (
    <Screen
      title="Torvet"
      right={<Button title="Sælg" icon="plus" onPress={() => router.push('/torvet/saelg')} style={{ minHeight: TAP, paddingHorizontal: 16 }} />}
    >
      <Segmented label="Vis annoncer" options={views} value={view} onChange={setView} />

      {view === 'salg' && (
        <>
          <TextField label="Søg på Torvet" showLabel={false} placeholder="Søg på Torvet" value={query} onChangeText={setQuery} />
          <View style={s.filters}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Placering: ${loc?.city ?? 'ikke valgt'}. Skift`} onPress={() => setLocOpen(true)} style={s.chip}>
              <Icon name="pin" size={16} />
              <T v="label">{loc?.city || 'Vælg placering'}</T>
            </Pressable>
            {loc && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Afstand: ${km === null ? 'hele landet' : `inden for ${km} km`}. Skift`}
                onPress={() => setRadiusOpen(true)}
                style={s.chip}
              >
                <T v="label">{radiusText(km)}</T>
                <Icon name="chevron-down" size={16} />
              </Pressable>
            )}
          </View>
        </>
      )}

      {view === 'salg' && loc === null ? (
        <View style={s.empty}>
          <T v="headingM">Hvor er du?</T>
          <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center' }}>
            Torvet viser annoncer i nærheden af dig.
          </T>
          <Button title="Vælg placering" icon="pin" onPress={() => setLocOpen(true)} />
        </View>
      ) : all === null || loc === undefined ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={color.textPrimary} />
      ) : shown.length === 0 ? (
        <View style={s.empty}>
          <T v="bodyS" c={color.textSecondary}>
            {empty}
          </T>
          {view === 'dine' && <Button title="Sælg noget" variant="secondary" onPress={() => router.push('/torvet/saelg')} />}
        </View>
      ) : forYou.length > 0 ? (
        <>
          <T v="headingM" accessibilityRole="header">
            Til dig
          </T>
          {grid(forYou)}
          {rest.length > 0 && (
            <>
              <T v="headingM" accessibilityRole="header">
                Mere på Torvet
              </T>
              {grid(rest)}
            </>
          )}
        </>
      ) : (
        grid(rest)
      )}

      <ListingRadiusSheet open={radiusOpen} value={km} city={loc?.city ?? ''} onClose={() => setRadiusOpen(false)} onApply={applyKm} />
      <ListingLocationSheet open={locOpen} onClose={() => setLocOpen(false)} onPick={pickLocation} />
    </Screen>
  );
}

const s = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    minHeight: TAP,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 18 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 32 },
});
