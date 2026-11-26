import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EventInviteSheet } from '@/components/EventInviteSheet';
import { Icon, type IconName } from '@/components/Icon';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import {
  eventGuests,
  getEvent,
  longDate,
  postsWhere,
  rsvpLabel,
  rsvpOrder,
  setRsvp,
  timeRange,
  type EventCard,
  type Guest,
  type Rsvp,
} from '@/lib/community';
import { imageSource } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, radius, TAP } from '@/theme/tokens';

type Guests = Awaited<ReturnType<typeof eventGuests>>;

/** Begivenhed: tid, sted, arrangør, dit svar, gæster og opslag */
export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [event, setEvent] = useState<EventCard | null | undefined>(undefined);
  const [guests, setGuests] = useState<Guests | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const e = await getEvent(id);
    setEvent(e);
    if (e) {
      const [g, p] = await Promise.all([eventGuests(id), postsWhere('event_id', id)]);
      setGuests(g);
      setPosts(p);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (event === undefined) return <Screen title="Begivenhed">{null}</Screen>;
  if (event === null)
    return (
      <Screen title="Begivenhed">
        <T v="bodyS" c={color.textSecondary}>
          Begivenheden findes ikke længere.
        </T>
      </Screen>
    );

  const mine = event.created_by === me.id;
  const answer = async (r: Rsvp) => {
    const next = event.my_status === r ? null : r;
    setEvent({ ...event, my_status: next });
    await setRsvp(event.id, me.id, next);
    load();
  };

  const rows: { label: string; list: Guest[] }[] = guests
    ? [
        { label: 'Deltager', list: guests.deltager },
        { label: 'Måske', list: guests.maaske },
        { label: 'Interesseret', list: guests.interesseret },
        { label: 'Deltager ikke', list: guests.deltager_ikke },
        { label: 'Inviteret', list: guests.invited },
      ].filter((r) => r.list.length)
    : [];
  const everyone = guests ? [...guests.deltager, ...guests.maaske, ...guests.interesseret, ...guests.deltager_ikke, ...guests.invited].map((g) => g.id) : [];

  return (
    <Screen title="Begivenhed">
      {event.cover_path && <Image source={imageSource(event.cover_path)} style={s.photo} contentFit="cover" transition={150} />}
      <T v="titleL" accessibilityRole="header">
        {event.title}
      </T>

      <Info icon="calendar" title={longDate(event.starts_at)} sub={timeRange(event.starts_at, event.ends_at)} />
      {!!event.location && <Info icon="pin" title={event.location} />}
      <Pressable accessibilityRole="link" onPress={() => router.push(mine ? '/profil' : `/bruger/${event.organizer_username}`)} style={s.info}>
        <Avatar name={event.organizer_name} path={event.organizer_avatar_path} />
        <View style={{ flex: 1 }}>
          <T v="headingS">{event.organizer_name}</T>
          <T v="caption" c={color.textSecondary}>
            Arrangør
          </T>
        </View>
      </Pressable>
      <View style={s.privacy}>
        <Icon name={event.privacy === 'offentlig' ? 'globe' : 'lock'} size={16} color={color.textSecondary} />
        <T v="caption" c={color.textSecondary}>
          {event.privacy === 'offentlig' ? 'Offentlig · alle kan se og tilmelde sig' : 'Kun inviterede'}
        </T>
      </View>

      {!!event.description && <T v="bodyS">{event.description}</T>}

      <View style={{ gap: 8 }}>
        <T v="headingS">Dit svar</T>
        <View style={s.picker} accessibilityRole="radiogroup" accessibilityLabel="Dit svar">
          {rsvpOrder.map((r) => {
            const on = event.my_status === r;
            return (
              <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => answer(r)} style={[s.opt, on && s.optOn]}>
                {on && <Icon name="check" size={16} color={color.white} />}
                <T v="label" c={on ? color.white : color.textPrimary}>
                  {rsvpLabel[r]}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button title="Inviter" variant="secondary" icon="user-plus" block onPress={() => setInviting(true)} />

      <View style={{ gap: 10 }}>
        <T v="headingM" accessibilityRole="header">
          Gæster
        </T>
        <T v="caption" c={color.textSecondary}>
          {event.going} deltager
        </T>
        {rows.map((r) => (
          <View key={r.label} style={s.guestRow}>
            <T v="captionStrong" style={{ width: 92 }}>
              {r.label}
            </T>
            <View style={s.faces}>
              {r.list.slice(0, 4).map((g, i) => (
                <View key={g.id} style={{ marginLeft: i ? -8 : 0, borderRadius: 14, borderWidth: 2, borderColor: color.bgApp }}>
                  <Avatar name={g.name} path={g.avatar_path} size="S" />
                </View>
              ))}
            </View>
            <T v="caption" c={color.textSecondary} numberOfLines={2} style={{ flex: 1 }}>
              {r.list.map((g) => (g.id === me.id ? 'Dig' : g.name.split(' ')[0])).join(', ')}
            </T>
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <T v="headingM" accessibilityRole="header">
          Opslag
        </T>
        <Button title="Skriv i begivenheden" variant="secondary" icon="edit" block onPress={() => router.push(`/opret?begivenhed=${event.id}`)} />
        {posts.length === 0 ? (
          <T v="caption" c={color.textSecondary}>
            Ingen opslag endnu. Skriv det første.
          </T>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} onRemoved={() => setPosts((l) => l.filter((x) => x.id !== p.id))} />)
        )}
      </View>

      {mine &&
        (deleting ? (
          <View style={s.confirm}>
            <T v="bodyS">Slet begivenheden? Gæster og opslag forsvinder også.</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Annuller" variant="secondary" style={{ flex: 1 }} onPress={() => setDeleting(false)} />
              <Button
                title="Slet"
                style={{ flex: 1 }}
                onPress={async () => {
                  await supabase.from('events').delete().eq('id', event.id);
                  router.canGoBack() ? router.back() : router.replace('/begivenheder');
                }}
              />
            </View>
          </View>
        ) : (
          <Button title="Slet begivenhed" variant="danger" onPress={() => setDeleting(true)} />
        ))}

      <EventInviteSheet open={inviting} onClose={() => setInviting(false)} eventId={event.id} me={me.id} exclude={[me.id, event.created_by, ...everyone]} onDone={load} />
    </Screen>
  );
}

function Info({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <View style={s.info}>
      <View style={s.tile}>
        <Icon name={icon} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="label">{title}</T>
        {sub && (
          <T v="caption" c={color.textSecondary}>
            {sub}
          </T>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1.8, borderRadius: radius.xl, backgroundColor: color.bgSubtle },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TAP },
  tile: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: TAP,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
  },
  optOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faces: { flexDirection: 'row', minWidth: 30 },
  confirm: { gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: color.bgSubtle },
});
