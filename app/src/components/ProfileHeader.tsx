import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { fmtNumber } from '@/lib/time';
import type { Profile } from '@/lib/types';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { T } from './T';

type Props = {
  me: Pick<Profile, 'name' | 'username' | 'bio' | 'avatar_path' | 'is_private'>;
  /** Du har et aktivt moment: grøn ring, og et tryk åbner det. Ellers et plus, der laver et nyt. */
  hasMoment: boolean;
  onRing: () => void;
  posts: number;
  followers: number;
  following: number;
};

/**
 * Toppen af din egen profil (prototypens .pf-identity, .pf-bio og .pf-stats):
 * billede med moment-ring, navn, @brugernavn, Indstillinger, bio og tal.
 */
export function ProfileHeader({ me, hasMoment, onRing, posts, followers, following }: Props) {
  return (
    <>
      <View style={s.identity} accessibilityLabel="Din profil">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasMoment ? 'Se dit moment' : 'Del et moment'}
          onPress={onRing}
          style={({ pressed }) => [s.ring, !hasMoment && s.ringNone, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Avatar name={me.name} path={me.avatar_path} size={72} tone="blue" />
          {!hasMoment && (
            <View style={s.plus}>
              <Icon name="plus" size={16} color={color.textOnAction} stroke={2.5} />
            </View>
          )}
        </Pressable>
        <View style={s.name}>
          <T v="titleL" numberOfLines={1} accessibilityRole="header">
            {me.name}
          </T>
          <View style={s.userRow}>
            <T v="caption" c={color.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
              @{me.username}
            </T>
            {me.is_private && (
              <Pressable accessibilityRole="link" onPress={() => router.push('/indstillinger/privatliv')} style={s.private}>
                <Icon name="lock" size={12} color={color.textSecondary} />
                <T v="caption" c={color.textSecondary}>
                  Privat
                </T>
              </Pressable>
            )}
          </View>
        </View>
        <IconButton icon="settings" label="Indstillinger" onPress={() => router.push('/indstillinger')} />
      </View>

      {!!me.bio?.trim() && <T v="bodyS">{me.bio.trim()}</T>}

      <View style={s.stats}>
        <Stat n={posts} label="Opslag" />
        <Stat n={followers} label="Følgere" />
        <Stat n={following} label="Følger" />
      </View>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={s.stat} accessible accessibilityLabel={`${fmtNumber(n)} ${label}`}>
      <T v="headingM">{fmtNumber(n)}</T>
      <T v="caption" c={color.textSecondary}>
        {label}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ring: {
    width: 84,
    height: 84,
    flexShrink: 0,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: color.accentHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNone: { borderColor: 'transparent' },
  // Plus nederst til højre (som "Dig" på forsiden)
  plus: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: color.bgApp,
    backgroundColor: color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1, minWidth: 0, gap: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  private: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: color.bgSubtle,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
});
