import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { dateBadge, rsvpLabel, shortWhen, timeRange, type EventCard as Ev } from '@/lib/community';
import { imageSource } from '@/lib/media';
import { color, font, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { T } from './T';

/** Mærket på kortet: dit svar, ellers "Privat" for private begivenheder (som prototypen) */
function statusFor(e: Ev) {
  if (e.my_status) return rsvpLabel[e.my_status];
  return e.privacy === 'inviterede' ? 'Privat' : undefined;
}

/** Kort i "Dine begivenheder" (prototypens .event-card): datomærke, titel, sted og status */
export function EventCard({ event, me }: { event: Ev; me: string }) {
  const { day, month } = dateBadge(event.starts_at);
  const status = statusFor(event);
  const sharedPublicly = event.created_by === me && event.privacy === 'offentlig';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${event.title}, ${shortWhen(event.starts_at)}${status ? `, ${status}` : ''}`}
      onPress={() => router.push(`/begivenheder/${event.id}`)}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      <View style={s.date}>
        <T style={s.day} c={color.accentVerifiedText}>
          {day}
        </T>
        <T v="micro" c={color.accentVerifiedText}>
          {month}
        </T>
      </View>
      <View style={s.text}>
        <T v="headingS">{event.title}</T>
        {!!event.location && (
          <T v="caption" c={color.textSecondary}>
            {event.location}
          </T>
        )}
        {sharedPublicly && (
          <T v="caption" c={color.accentNoteText}>
            Synlig for alle under Find begivenheder
          </T>
        )}
      </View>
      {status && (
        <View style={s.status}>
          <T v="captionStrong" numberOfLines={1}>
            {status}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** Kort i "Find begivenheder" (prototypens .find-card): billede, tid, titel, sted, arrangør, antal og hurtige svar */
export function EventDiscoverCard({ event, onJoin }: { event: Ev; onJoin: (s: 'interesseret' | 'deltager') => void }) {
  return (
    <View style={s.find}>
      <Pressable accessibilityRole="link" accessibilityLabel={event.title} onPress={() => router.push(`/begivenheder/${event.id}`)}>
        {!!event.cover_path && <Image source={imageSource(event.cover_path)} style={s.photo} contentFit="cover" transition={150} />}
        <View style={s.body}>
          <T v="captionStrong" c={color.accentNoteText}>
            {shortWhen(event.starts_at).split(' · ')[0]} · {timeRange(event.starts_at, event.ends_at).replace(/^Kl\. /, 'kl. ')}
          </T>
          <T v="headingS">{event.title}</T>
          {!!event.location && (
            <View style={s.line}>
              <Icon name="pin" size={16} color={color.textSecondary} />
              <T v="caption" c={color.textSecondary} style={{ flexShrink: 1 }}>
                {event.location}
              </T>
            </View>
          )}
          <View style={s.meta}>
            <Avatar name={event.organizer_name} path={event.organizer_avatar_path} size="S" />
            <T v="caption" numberOfLines={1} style={s.org}>
              {event.organizer_name}
            </T>
            <T v="caption" c={color.textSecondary} style={{ flexShrink: 0 }}>
              {event.going} deltager
            </T>
          </View>
        </View>
      </Pressable>
      <View style={s.actions}>
        <Button title="Interesseret" variant="secondary" style={{ flex: 1 }} onPress={() => onJoin('interesseret')} accessibilityLabel={`Interesseret i ${event.title}`} />
        <Button title="Deltag" style={{ flex: 1 }} onPress={() => onJoin('deltager')} accessibilityLabel={`Deltag i ${event.title}`} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 90,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  date: { width: 56, height: 62, flexShrink: 0, borderRadius: radius.md, backgroundColor: color.accentVerifiedBg, alignItems: 'center', justifyContent: 'center' },
  day: { fontFamily: font.title, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  status: { flexShrink: 0, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  find: { overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  photo: { width: '100%', height: 140, backgroundColor: color.bgSubtle },
  body: { gap: 4, paddingTop: 12, paddingHorizontal: 14 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  org: { flex: 1, minWidth: 0, fontFamily: font.bodySemi },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 },
});
