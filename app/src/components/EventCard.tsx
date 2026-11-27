import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { dateBadge, rsvpLabel, shortWhen, type EventCard as Ev } from '@/lib/community';
import { imageSource } from '@/lib/media';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { T } from './T';

/** Mærket på kortet: dit svar, "Inviteret" eller "Privat" */
function statusFor(e: Ev) {
  if (e.my_status) return rsvpLabel[e.my_status];
  if (e.invited_me) return 'Inviteret';
  return e.privacy === 'inviterede' ? 'Privat' : undefined;
}

/** Kort i "Dine begivenheder": datomærke, titel, sted og status */
export function EventCard({ event }: { event: Ev }) {
  const { day, month } = dateBadge(event.starts_at);
  const status = statusFor(event);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${event.title}, ${shortWhen(event.starts_at)}`} onPress={() => router.push(`/begivenheder/${event.id}`)} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
      <View style={s.date}>
        <T v="titleL" style={{ lineHeight: 26 }}>
          {day}
        </T>
        <T v="micro" c={color.textSecondary}>
          {month}
        </T>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headingS" numberOfLines={2}>
          {event.title}
        </T>
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {event.location || shortWhen(event.starts_at)}
        </T>
      </View>
      {status && (
        <View style={[s.status, event.my_status === 'deltager' && s.statusOn]}>
          <T v="captionStrong">{status}</T>
        </View>
      )}
    </Pressable>
  );
}

/** Kort i "Find begivenheder": billede, tid, titel, sted, arrangør, antal og hurtige svar */
export function EventDiscoverCard({ event, onJoin }: { event: Ev; onJoin: (s: 'interesseret' | 'deltager') => void }) {
  return (
    <View style={s.find}>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/begivenheder/${event.id}`)} style={{ gap: 10 }}>
        {event.cover_path ? (
          <Image source={imageSource(event.cover_path)} style={s.photo} contentFit="cover" transition={150} />
        ) : (
          <View style={[s.photo, s.photoEmpty]}>
            <Icon name="calendar" size={28} color={color.green700} />
          </View>
        )}
        <View style={{ gap: 4, paddingHorizontal: 14 }}>
          <T v="captionStrong" c={color.green700}>
            {shortWhen(event.starts_at)}
          </T>
          <T v="headingS">{event.title}</T>
          {!!event.location && (
            <View style={s.line}>
              <Icon name="pin" size={16} color={color.textSecondary} />
              <T v="caption" c={color.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {event.location}
              </T>
            </View>
          )}
          <View style={s.line}>
            <Avatar name={event.organizer_name} path={event.organizer_avatar_path} size={24} />
            <T v="caption" numberOfLines={1} style={{ flex: 1 }}>
              {event.organizer_name}
            </T>
            <T v="caption" c={color.textSecondary}>
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
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  date: { width: 52, height: 56, borderRadius: radius.md, backgroundColor: color.noteBg, alignItems: 'center', justifyContent: 'center' },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  statusOn: { backgroundColor: color.accentBg },
  find: { gap: 12, paddingBottom: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 2, backgroundColor: color.bgSubtle },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
});
