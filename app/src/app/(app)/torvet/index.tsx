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
  chooseCity,
  currentLocation,
  defaultLocation,
  listingsNear,
  type LocState,
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
  const [where, setWhere] = useState<LocState | null>(null);
  const loc: MyLocation | null = where && (where.status === 'live' || where.status === 'manual') ? where.loc : null;
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
  }, []);

  // Din placering, der hvor du er nu: hentes hver gang Torvet åbnes (huskes et par minutter)
  const locate = useCallback(
    async (force = false) => {
      setWhere((w) => (force ? null : w));
      setWhere(await currentLocation(me.id, { force }));
    },
    [me.id],
  );
  useFocusEffect(
    useCallback(() => {
      locate();
    }, [locate]),
  );

  const pickCity = async (name: string | null) => {
    const l = await chooseCity(name);
    if (l) setWhere({ status: 'manual', loc: l });
    else locate(true);
  };

  const load = useCallback(async () => {
    if (view === 'dine') return setAll(await myListings(me.id));
    if (view === 'gemte') return setAll(await savedListings(me.id));
    if (!where) return;
    if (!loc) {
      // Ingen placering: hele landet, uden afstande
      const rows = await listingsNear(defaultLocation, null);
      setAll(rows.filter((l) => l.seller_id !== me.id).map((l) => ({ ...l, distance_km: null })));
      return;
    }
    const [rows, cats] = await Promise.all([listingsNear(loc, km), recentCategories()]);
    // Dine egne annoncer ligger under "Dine annoncer"
    setAll(rows.filter((l) => l.seller_id !== me.id));
    setRecent(cats);
  }, [view, where, loc, km, me.id]);

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
        : q
          ? 'Ingen annoncer matcher din søgning.'
          : loc && km !== null
            ? `Ingen annoncer inden for ${km} km fra ${city} endnu. Prøv en større afstand.`
            : 'Der er ingen annoncer endnu.';

  return (
    <MarketEventsShell onRefresh={load}>
      <View style={s.market}>
        <View style={s.header}>
          <T v="titleXl" accessibilityRole="header">
            Torvet
          </T>
          <Button title="Sælg noget" icon="plus" iconSize={20} gap={6} onPress={() => router.push('/torvet/saelg')} style={s.sell} />
        </View>

        <SegmentedControl label="Vis annoncer" options={views} value={view} onChange={(v) => (setAll(null), setView(v))} />

        {view === 'salg' && (
          <View style={s.filters}>
            <View style={{ alignSelf: 'stretch' }}>
              <TextField label="Søg på Torvet" showLabel={false} value={query} onChangeText={setQuery} />
            </View>
            {loc ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Afstand: ${km === null ? 'hele landet' : `inden for ${km} km`} fra ${city}. Skift`}
                onPress={() => setRadiusOpen(true)}
                style={({ pressed }) => [s.radius, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <Icon name="pin" size={18} />
                <T v="label">
                  {radiusText(km)}
                  <T v="label" c={color.textSecondary}>
                    {km === null ? '' : ` fra ${city}`}
                  </T>
                </T>
                <Icon name="chevron-down" size={16} color={color.textSecondary} />
              </Pressable>
            ) : where === null ? (
              <View style={[s.radius, { borderColor: color.borderDefault }]} accessibilityLabel="Finder din placering">
                <Icon name="pin" size={18} color={color.textSecondary} />
                <T v="label" c={color.textSecondary}>
                  Finder din placering …
                </T>
              </View>
            ) : null}
          </View>
        )}

        {/* Ingen placering: forklar det venligt, og lad folk prøve igen eller vælge en by */}
        {view === 'salg' && where && !loc && (
          <View style={s.locCard}>
            <View style={s.locTile}>
              <Icon name="pin" size={20} color={color.green700} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <T v="headingS">Slå placering til for at se annoncer i nærheden</T>
              <T v="bodyS" c={color.textSecondary}>
                {where.status === 'denied'
                  ? 'Din placering er slået fra for ciircle. Slå den til i browserens eller telefonens indstillinger, eller vælg en by.'
                  : 'Vi kunne ikke finde din placering lige nu. Prøv igen, eller vælg en by.'}{' '}
                Indtil da ser du annoncer fra hele landet.
              </T>
              <View style={s.locActions}>
                <Button title="Prøv igen" variant="secondary" onPress={() => locate(true)} style={s.locBtn} />
                <Button title="Vælg by" variant="secondary" icon="pin" iconSize={16} gap={6} onPress={() => setRadiusOpen(true)} style={s.locBtn} />
              </View>
            </View>
          </View>
        )}

        {all === null ? null : shown.length === 0 ? (
          <View style={s.empty}>
            <T v="bodyS" c={color.textSecondary}>
              {empty}
            </T>
            {view === 'dine' && <Button title="Sælg noget" variant="secondary" onPress={() => router.push('/torvet/saelg')} />}
            {view === 'salg' && !q && loc && km !== null && <Button title="Vælg afstand" variant="secondary" icon="pin" iconSize={16} gap={6} onPress={() => setRadiusOpen(true)} />}
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

      <ListingRadiusSheet
        open={radiusOpen}
        value={km}
        city={city}
        source={where?.status === 'live' ? 'live' : where?.status === 'manual' ? 'manual' : 'none'}
        onClose={() => setRadiusOpen(false)}
        onApply={applyKm}
        onPickCity={pickCity}
      />
    </MarketEventsShell>
  );
}

const s = StyleSheet.create({
  market: { gap: 14, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sell: { paddingLeft: 14 },
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
  locCard: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg, backgroundColor: color.bgSurface },
  locTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg, borderWidth: 1, borderColor: color.accentBg },
  locActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  locBtn: { minHeight: 40, paddingHorizontal: 14 },
  empty: { alignItems: 'flex-start', gap: 12, paddingTop: 8, paddingBottom: 24 },
});
