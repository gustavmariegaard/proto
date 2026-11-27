import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EventCard, EventDiscoverCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { MarketEventsShell } from '@/components/MarketEventsShell';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { isMine, listEvents, rsvpLabel, setRsvp, type EventCard as Ev, type Rsvp } from '@/lib/community';
import { useMe } from '@/lib/session';
import { color, font, radius, TAP } from '@/theme/tokens';

type Tab = 'dine' | 'find';
type When = 'alle' | 'i-dag' | 'uge' | 'weekend';

const tabs: { value: Tab; label: string }[] = [
  { value: 'dine', label: 'Dine begivenheder' },
  { value: 'find', label: 'Find begivenheder' },
];

/** Rækkefølgen på filtrene. Et filter vises kun, hvis mindst én af dine begivenheder har den status. */
const statusFilters: Rsvp[] = ['interesseret', 'deltager', 'maaske', 'deltager_ikke'];

const whens: { value: When; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'i-dag', label: 'I dag' },
  { value: 'uge', label: 'Denne uge' },
  { value: 'weekend', label: 'Weekend' },
];

/** Start og slut (eksklusiv) for "I dag", "Denne uge" (til og med søndag) og "Weekend" */
function whenRange(when: When): [Date, Date] | null {
  if (when === 'alle') return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = (n: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + n);
  if (when === 'i-dag') return [start, day(1)];
  const dow = start.getDay();
  const toSunday = (7 - dow) % 7;
  if (when === 'uge') return [start, day(toSunday + 1)];
  return [dow === 0 ? start : day(toSunday - 1), day(toSunday + 1)];
}

/** Begivenheder (prototypens Events): dine og offentlige at finde */
export default function Events() {
  const me = useMe();
  const params = useLocalSearchParams<{ vis?: string }>();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [tab, setTabState] = useState<Tab>(params.vis === 'find' ? 'find' : 'dine');
  const [filter, setFilter] = useState<'alle' | Rsvp>('alle');
  const [when, setWhen] = useState<When>('alle');
  const [query, setQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [moved, setMoved] = useState<{ title: string; rsvp: 'deltager' | 'interesseret' } | null>(null);

  const load = useCallback(async () => setEvents(await listEvents()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setTab = (t: Tab) => {
    setMoved(null);
    setTabState(t);
  };

  const now = Date.now();
  const upcoming = (e: Ev) => new Date(e.ends_at ?? e.starts_at).getTime() >= now - 6 * 3600e3;
  const allMine = (events ?? []).filter((e) => isMine(e, me.id) && upcoming(e));
  const filters: { value: 'alle' | Rsvp; label: string }[] = [
    { value: 'alle', label: 'Alle' },
    ...statusFilters.filter((r) => allMine.some((e) => e.my_status === r)).map((r) => ({ value: r, label: rsvpLabel[r] })),
  ];
  // Forsvinder det valgte filter (fx fordi du har ændret dit svar), vises alle igen
  const active = filters.some((f) => f.value === filter) ? filter : 'alle';
  const mine = allMine.filter((e) => active === 'alle' || e.my_status === active);

  const range = whenRange(when);
  const words = query.trim().toLocaleLowerCase('da').split(/\s+/).filter(Boolean);
  const discoverable = (events ?? []).filter((e) => e.privacy === 'offentlig' && !isMine(e, me.id) && upcoming(e));
  const found = discoverable
    .filter((e) => !range || (new Date(e.starts_at) >= range[0] && new Date(e.starts_at) < range[1]))
    .filter((e) => {
      const hay = `${e.title} ${e.location} ${e.organizer_name} ${e.description}`.toLocaleLowerCase('da');
      return words.every((w) => hay.includes(w));
    });

  const join = async (e: Ev, rsvp: 'deltager' | 'interesseret') => {
    setEvents((l) => l?.map((x) => (x.id === e.id ? { ...x, my_status: rsvp, going: x.going + (rsvp === 'deltager' ? 1 : 0) } : x)) ?? null);
    setMoved({ title: e.title, rsvp });
    await setRsvp(e.id, me.id, rsvp);
  };

  return (
    <MarketEventsShell onRefresh={load}>
      <View style={s.events}>
        <View style={s.head}>
          <T v="titleXl" accessibilityRole="header">
            Begivenheder
          </T>
          <Button title="Opret" onPress={() => router.push('/begivenheder/ny')} />
        </View>

        <SegmentedControl label="Vis begivenheder" options={tabs} value={tab} onChange={setTab} />

        {tab === 'dine' ? (
          <>
            <T v="bodyS" c={color.textSecondary}>
              Det, du er inviteret til, har svaret på eller selv har oprettet.
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chips} accessibilityLabel="Filtrer dine begivenheder">
              {filters.map((f) => (
                <Chip key={f.value} selected={active === f.value} onPress={() => setFilter(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </ScrollView>
            {events === null ? null : mine.length ? (
              <View style={s.list}>
                {mine.map((e) => (
                  <EventCard key={e.id} event={e} me={me.id} />
                ))}
              </View>
            ) : (
              <T v="bodyS" c={color.textSecondary}>
                Ingen begivenheder her endnu.
              </T>
            )}
            <Pressable accessibilityRole="button" onPress={() => setTab('find')} style={({ pressed }) => [s.more, pressed && { opacity: 0.8 }]}>
              <T v="label">Find offentlige begivenheder i nærheden</T>
              <Icon name="search" size={20} />
            </Pressable>
          </>
        ) : (
          <>
            <T v="bodyS" c={color.textSecondary}>
              Offentlige begivenheder i nærheden. Du behøver ikke en invitation – tilmeld dig direkte.
            </T>
            <View style={[s.search, searchFocus && s.searchFocus]}>
              <Icon name="search" size={20} color={color.textSecondary} />
              <TextInput
                style={[s.searchInput, noOutline]}
                accessibilityLabel="Søg i begivenheder"
                placeholder="Søg efter titel, sted eller arrangør"
                placeholderTextColor={color.textSecondary}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chips} accessibilityLabel="Hvornår">
              {whens.map((w) => (
                <Chip key={w.value} selected={when === w.value} onPress={() => setWhen(w.value)}>
                  {w.label}
                </Chip>
              ))}
            </ScrollView>

            {moved && (
              <View style={s.moved} accessibilityLiveRegion="polite">
                <T v="bodyS" c={color.accentNoteText} style={{ flex: 1 }}>
                  {moved.rsvp === 'deltager' ? 'Du deltager i' : 'Du er interesseret i'} „{moved.title}“. Den ligger nu under Dine begivenheder.
                </T>
                <Pressable accessibilityRole="button" onPress={() => setTab('dine')} style={s.movedLink}>
                  <T v="label">Se dine begivenheder</T>
                </Pressable>
              </View>
            )}

            {events === null ? null : found.length ? (
              <View style={s.list}>
                {found.map((e) => (
                  <EventDiscoverCard key={e.id} event={e} onJoin={(r) => join(e, r)} />
                ))}
              </View>
            ) : (
              <T v="bodyS" c={color.textSecondary}>
                {discoverable.length
                  ? 'Ingen offentlige begivenheder passer til din søgning. Prøv en anden dato eller et andet ord.'
                  : 'Du er allerede med i alle offentlige begivenheder i nærheden.'}
              </T>
            )}
          </>
        )}
      </View>
    </MarketEventsShell>
  );
}

const s = StyleSheet.create({
  events: { gap: 14, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  list: { gap: 14 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: TAP, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderStrong, backgroundColor: color.bgSurface },
  searchFocus: { borderColor: color.textPrimary, borderWidth: 2, paddingHorizontal: 15 },
  searchInput: { flex: 1, minWidth: 0, height: '100%', padding: 0, color: color.textPrimary, fontFamily: font.body, fontSize: 16 },
  moved: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingRight: 6, paddingLeft: 14, borderRadius: radius.md, backgroundColor: color.accentNoteBg },
  movedLink: { flexShrink: 0, minHeight: TAP, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.bgSurface },
});
