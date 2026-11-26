import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EventCard, EventDiscoverCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { isMine, listEvents, rsvpLabel, rsvpOrder, setRsvp, type EventCard as Ev, type Rsvp } from '@/lib/community';
import { useMe } from '@/lib/session';
import { color, radius, TAP } from '@/theme/tokens';

type Tab = 'dine' | 'find';
type When = 'alle' | 'i-dag' | 'uge' | 'weekend';
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
  if (when === 'i-dag') return [new Date(), day(1)];
  const dow = start.getDay();
  const toSunday = (7 - dow) % 7;
  if (when === 'uge') return [new Date(), day(toSunday + 1)];
  return [dow === 0 ? new Date() : day(toSunday - 1), day(toSunday + 1)];
}

/** Begivenheder: dine (inviteret, svaret eller oprettet) og offentlige at finde */
export default function Events() {
  const me = useMe();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [tab, setTab] = useState<Tab>('dine');
  const [filter, setFilter] = useState<'alle' | Rsvp>('alle');
  const [when, setWhen] = useState<When>('alle');
  const [query, setQuery] = useState('');
  const [moved, setMoved] = useState<{ title: string; rsvp: 'deltager' | 'interesseret' } | null>(null);

  const load = useCallback(async () => setEvents(await listEvents()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const now = Date.now();
  const upcoming = (e: Ev) => new Date(e.ends_at ?? e.starts_at).getTime() >= now - 6 * 3600e3;
  const allMine = (events ?? []).filter((e) => isMine(e, me.id) && upcoming(e));
  // Et filter vises kun, hvis mindst én af dine begivenheder har den status
  const filters: { value: 'alle' | Rsvp; label: string }[] = [
    { value: 'alle', label: 'Alle' },
    ...rsvpOrder.filter((r) => allMine.some((e) => e.my_status === r)).map((r) => ({ value: r, label: rsvpLabel[r] })),
  ];
  const active = filters.some((f) => f.value === filter) ? filter : 'alle';
  const mine = allMine.filter((e) => active === 'alle' || e.my_status === active);

  const range = whenRange(when);
  const words = query.trim().toLocaleLowerCase('da').split(/\s+/).filter(Boolean);
  const found = (events ?? [])
    .filter((e) => e.privacy === 'offentlig' && !isMine(e, me.id) && upcoming(e))
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
    <Screen title="Begivenheder" right={<Button title="Opret" onPress={() => router.push('/begivenheder/ny')} style={{ minHeight: TAP, paddingHorizontal: 18 }} />} scroll={false}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Segmented
          label="Vis begivenheder"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setMoved(null);
          }}
          options={[
            { value: 'dine', label: 'Dine begivenheder' },
            { value: 'find', label: 'Find begivenheder' },
          ]}
        />

        {events === null ? (
          <ActivityIndicator color={color.textPrimary} style={{ marginTop: 24 }} />
        ) : tab === 'dine' ? (
          <>
            {filters.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityLabel="Filtrer dine begivenheder">
                {filters.map((f) => (
                  <Chip key={f.value} label={f.label} selected={active === f.value} onPress={() => setFilter(f.value)} small />
                ))}
              </ScrollView>
            )}
            {mine.length ? (
              <View style={s.list}>
                {mine.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </View>
            ) : (
              <T v="bodyS" c={color.textSecondary} style={s.empty}>
                Ingen begivenheder her endnu.
              </T>
            )}
            <Pressable accessibilityRole="button" onPress={() => setTab('find')} style={s.more}>
              <T v="label">Find offentlige begivenheder</T>
              <Icon name="search" size={20} />
            </Pressable>
          </>
        ) : (
          <>
            <TextField label="Søg i begivenheder" showLabel={false} placeholder="Søg efter titel, sted eller arrangør" value={query} onChangeText={setQuery} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityLabel="Hvornår">
              {whens.map((w) => (
                <Chip key={w.value} label={w.label} selected={when === w.value} onPress={() => setWhen(w.value)} small />
              ))}
            </ScrollView>
            {moved && (
              <View style={s.moved} accessibilityLiveRegion="polite">
                <T v="bodyS">
                  {moved.rsvp === 'deltager' ? 'Du deltager i' : 'Du er interesseret i'} „{moved.title}“.
                </T>
                <Pressable accessibilityRole="button" onPress={() => setTab('dine')} style={{ minHeight: TAP, justifyContent: 'center' }}>
                  <T v="label" style={{ textDecorationLine: 'underline' }}>
                    Se dine begivenheder
                  </T>
                </Pressable>
              </View>
            )}
            {found.length ? (
              <View style={s.list}>
                {found.map((e) => (
                  <EventDiscoverCard key={e.id} event={e} onJoin={(r) => join(e, r)} />
                ))}
              </View>
            ) : (
              <T v="bodyS" c={color.textSecondary} style={s.empty}>
                Ingen offentlige begivenheder lige nu.
              </T>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 14, paddingBottom: 40 },
  chips: { gap: 8 },
  list: { gap: 10 },
  empty: { paddingVertical: 16 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP + 8, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  moved: { padding: 14, paddingBottom: 4, borderRadius: radius.lg, backgroundColor: color.noteBg },
});
