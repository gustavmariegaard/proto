import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { PostCard } from '@/components/PostCard';
import { Item } from '@/components/PostMenu';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { Tag } from '@/components/Tag';
import { eventGuests, getEvent, longDate, postsWhere, rsvpLabel, setRsvp, timeRange, type EventCard, type Guest, type Rsvp } from '@/lib/community';
import { imageSource } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, font, radius, TAP } from '@/theme/tokens';

type Guests = Awaited<ReturnType<typeof eventGuests>>;

/** "Mette og Jonas og dig" – som i prototypen */
function names(list: Guest[], me: string) {
  const text = list.map((g) => (g.id === me ? 'dig' : g.name.split(' ')[0])).join(' og ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Begivenhed (prototypens EventDetail). Interesseret og Deltager / Måske / Deltager ikke skifter dit svar. */
export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<EventCard | null | undefined>(undefined);
  const [guests, setGuests] = useState<Guests | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  // Kun arrangøren: ⋯-menu med "Slet begivenhed" (ikke i prototypen, men samme princip som "Slet opslag")
  const [sheet, setSheet] = useState<null | 'menu' | 'slet'>(null);
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

  if (event === undefined) return <View style={s.screen}><PageHeader title="Begivenhed" fallback="/begivenheder" /></View>;
  if (event === null)
    return (
      <View style={s.screen}>
        <PageHeader title="Begivenhed" fallback="/begivenheder" />
        <View style={s.content}>
          <T v="bodyS" c={color.textSecondary}>
            Begivenheden findes ikke længere.
          </T>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/begivenheder')} style={s.link}>
            <T v="label" style={{ textDecorationLine: 'underline' }}>
              Se alle begivenheder
            </T>
          </Pressable>
        </View>
      </View>
    );

  const rsvp = event.my_status;
  const mine = event.created_by === me.id;
  const isPublic = event.privacy === 'offentlig';
  /** Offentlig begivenhed, du ikke er inviteret til – du kan tilmelde dig direkte */
  const openToJoin = isPublic && !event.invited_me && !mine;

  const toggle = async (r: Rsvp) => {
    const next = rsvp === r ? null : r;
    setEvent({ ...event, my_status: next });
    await setRsvp(event.id, me.id, next);
    load();
  };

  // Som prototypen: Deltager, Deltager ikke og Inviteret (inviterede, der ikke har svaret endeligt).
  // I private begivenheder er alle inviteret, så Måske og Interesseret står under Inviteret.
  const rows: { label: string; list: Guest[] }[] = guests
    ? [
        { label: 'Deltager', list: guests.deltager },
        { label: 'Deltager ikke', list: guests.deltager_ikke },
        { label: 'Inviteret', list: isPublic ? guests.invited : [...guests.invited, ...guests.maaske, ...guests.interesseret] },
      ].filter((r) => r.list.length > 0)
    : [];

  const openMap = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`);

  return (
    <View style={s.screen}>
      <PageHeader title="Begivenhed" fallback="/begivenheder">
        {mine && <IconButton icon="dots" label="Flere muligheder" onPress={() => setSheet('menu')} />}
      </PageHeader>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]}>
        {!!event.cover_path && <Image source={imageSource(event.cover_path)} style={s.photo} contentFit="cover" transition={150} />}
        <T v="titleL" accessibilityRole="header">
          {event.title}
        </T>

        <Info icon="calendar" title={longDate(event.starts_at)} sub={timeRange(event.starts_at, event.ends_at)} />
        {!!event.location && (
          <Pressable accessibilityRole="link" accessibilityLabel={`${event.location}. Vis på kort`} onPress={openMap}>
            <Info icon="pin" title={event.location} sub="Vis på kort" />
          </Pressable>
        )}

        <Pressable accessibilityRole="link" onPress={() => router.push(`/bruger/${event.organizer_username}`)} style={s.organizer}>
          <Avatar name={event.organizer_name} path={event.organizer_avatar_path} />
          <View style={s.infoText}>
            <T v="headingS">{event.organizer_name}</T>
            <T v="caption" c={color.textSecondary}>
              Arrangør
            </T>
          </View>
        </Pressable>

        <View style={s.privacy}>
          <Tag>{isPublic ? 'Offentlig begivenhed' : 'Privat begivenhed'}</Tag>
          <T v="caption" c={color.textSecondary} style={{ flex: 1, minWidth: 0 }}>
            {!isPublic
              ? 'Kun inviterede kan se og tilmelde sig.'
              : mine
                ? 'Synlig for alle under Find begivenheder. Alle kan tilmelde sig.'
                : openToJoin
                  ? 'Alle kan se og tilmelde sig. Du behøver ikke en invitation.'
                  : 'Alle kan se og tilmelde sig.'}
          </T>
        </View>

        {!!event.description && (
          <T v="bodyS" style={{ alignSelf: 'stretch' }}>
            {event.description}
          </T>
        )}

        <Button
          title="Interesseret"
          block
          variant={rsvp === 'interesseret' ? 'primary' : 'secondary'}
          accessibilityState={{ selected: rsvp === 'interesseret' }}
          onPress={() => toggle('interesseret')}
        />

        <View style={s.picker} accessibilityRole="radiogroup" accessibilityLabel="Dit svar">
          {(['deltager', 'maaske', 'deltager_ikke'] as const).map((r) => {
            const on = rsvp === r;
            return (
              <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => toggle(r)} style={[s.option, on && s.optionOn]}>
                <T style={s.optionText} c={on ? color.textOnAction : color.textSecondary} numberOfLines={1}>
                  {rsvpLabel[r]}
                </T>
              </Pressable>
            );
          })}
        </View>

        {openToJoin && (
          <T v="caption" c={color.accentNoteText} style={s.note} accessibilityLiveRegion="polite">
            {rsvp === 'deltager_ikke'
              ? 'Du har meldt fra. Den ligger under Dine begivenheder, så du kan ombestemme dig.'
              : rsvp === 'maaske'
                ? 'Du har svaret måske. Begivenheden ligger nu under Dine begivenheder.'
                : rsvp === 'interesseret'
                  ? 'Du er interesseret. Begivenheden ligger nu under Dine begivenheder.'
                  : rsvp === 'deltager'
                    ? 'Du deltager. Begivenheden ligger nu under Dine begivenheder.'
                    : 'Tryk Deltager eller Interesseret for at være med. Så ligger den under Dine begivenheder.'}
          </T>
        )}

        <View style={s.guests}>
          <T v="headingM" accessibilityRole="header">
            Gæster
          </T>
          {isPublic && (
            <T v="caption" c={color.textSecondary}>
              {event.going} deltager
            </T>
          )}
          {rows.map((r) => (
            <View key={r.label} style={s.guestRow}>
              <T v="captionStrong" c={color.textSecondary} style={s.guestLabel}>
                {r.label}
              </T>
              <View style={s.faces}>
                {r.list.map((g, i) => (
                  <View key={g.id} style={i > 0 ? { marginLeft: -8 } : undefined}>
                    <Avatar name={g.name} path={g.avatar_path} size="S" />
                  </View>
                ))}
              </View>
              <T v="caption" style={{ flex: 1, minWidth: 0 }}>
                {names(r.list, me.id)}
              </T>
            </View>
          ))}
        </View>

        {/* Opslag i begivenheden: man deler herinde, ikke via plus-knappen */}
        <View style={[s.posts, posts.length > 0 && { alignSelf: 'stretch' }]}>
          <T v="headingM" accessibilityRole="header">
            Opslag
          </T>
          <Button title="Skriv i begivenheden" variant="secondary" block onPress={() => router.push(`/opret?begivenhed=${event.id}`)} />
          {posts.length === 0 ? (
            <T v="caption" c={color.textSecondary}>
              Ingen opslag endnu. Skriv det første.
            </T>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} onRemoved={() => setPosts((l) => l.filter((x) => x.id !== p.id))} />)
          )}
        </View>
      </ScrollView>

      {mine && (
        <>
          <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Begivenhed" initialSize="auto" dim>
            <View style={[s.menu, { paddingBottom: 16 + insets.bottom }]}>
              <Item icon="close" label="Slet begivenhed" danger onPress={() => setSheet('slet')} />
            </View>
          </Sheet>
          <Sheet open={sheet === 'slet'} onClose={() => setSheet(null)} title="Slet begivenheden?" initialSize="auto" dim>
            <View style={[s.confirm, { paddingBottom: 24 + insets.bottom }]}>
              <T v="bodyS" c={color.textSecondary}>
                Gæster og opslag forsvinder også. Det kan ikke fortrydes.
              </T>
              <Button
                title="Slet begivenhed"
                block
                loading={deleting}
                onPress={async () => {
                  setDeleting(true);
                  const { error } = await supabase.from('events').delete().eq('id', event.id);
                  setDeleting(false);
                  setSheet(null);
                  if (!error) router.replace('/begivenheder');
                }}
              />
              <Button title="Annuller" variant="secondary" block onPress={() => setSheet(null)} />
            </View>
          </Sheet>
        </>
      )}
    </View>
  );
}

function Info({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <View style={s.info}>
      <View style={s.tile}>
        <Icon name={icon} />
      </View>
      <View style={s.infoText}>
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
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { alignItems: 'flex-start', gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  link: { minHeight: TAP, justifyContent: 'center' },
  photo: { alignSelf: 'stretch', height: 150, borderRadius: radius.xl, backgroundColor: color.bgSubtle },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tile: { width: 40, height: 40, flexShrink: 0, borderRadius: radius.md, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  infoText: { gap: 1, minWidth: 0, flexShrink: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  picker: { flexDirection: 'row', gap: 4, alignSelf: 'stretch', padding: 4, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  option: { flex: 1, minWidth: 0, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  optionOn: { backgroundColor: color.actionPrimary },
  optionText: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  note: { alignSelf: 'stretch', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.accentNoteBg, overflow: 'hidden' },
  guests: { alignSelf: 'stretch', gap: 12, padding: 14, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.xl, backgroundColor: color.bgSurface },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestLabel: { width: 96, flexShrink: 0 },
  faces: { flexDirection: 'row', flexShrink: 0 },
  posts: { gap: 12 },
  menu: { paddingTop: 8, paddingHorizontal: 12 },
  confirm: { gap: 12, paddingTop: 16, paddingHorizontal: 20 },
});
