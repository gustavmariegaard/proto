import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { fmtNumber } from '@/lib/time';
import type { Profile } from '@/lib/types';
import { color, momentRing, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Button } from './Button';
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

const RING = 84;

/**
 * Toppen af din egen profil: ét samlet kort med billede, navn og bio,
 * tallene i en række nederst og "Rediger profil" lige ved hånden.
 * Navnet står under billedet i fuld bredde, så lange navne altid kan læses.
 */
export function ProfileHeader({ me, hasMoment, onRing, posts, followers, following }: Props) {
  return (
    <View style={s.card} accessibilityLabel="Din profil">
      <View style={s.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasMoment ? 'Se dit moment' : 'Del et moment'}
          onPress={onRing}
          style={({ pressed }) => [s.ring, !hasMoment && s.ringNone, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Avatar name={me.name} path={me.avatar_path} size={RING - 2 * (momentRing.width + momentRing.gap)} tone="blue" />
          {!hasMoment && (
            <View style={s.plus}>
              <Icon name="plus" size={16} color={color.textOnAction} stroke={2.5} />
            </View>
          )}
        </Pressable>

        <View style={{ flex: 1 }} />
        <IconButton icon="settings" label="Indstillinger" onPress={() => router.push('/indstillinger')} style={s.settings} />
      </View>

      <View style={s.name}>
        <T v="titleL" accessibilityRole="header">
          {me.name}
        </T>
        <View style={s.userRow}>
          <T v="caption" c={color.textSecondary} style={{ flexShrink: 1 }}>
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

      {!!me.bio?.trim() && <T v="bodyS">{me.bio.trim()}</T>}

      <View style={s.stats}>
        <Stat n={posts} label="Opslag" />
        <View style={s.divider} />
        <Stat n={followers} label="Følgere" />
        <View style={s.divider} />
        <Stat n={following} label="Følger" />
      </View>

      <Button variant="secondary" block icon="edit" onPress={() => router.push('/rediger-profil')}>
        Rediger profil
      </Button>
    </View>
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
  card: {
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ring: {
    width: RING,
    height: RING,
    flexShrink: 0,
    borderRadius: RING / 2,
    borderWidth: momentRing.width,
    borderColor: color.accentHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNone: { borderColor: 'transparent' },
  // Plus nederst til højre (som "Dig" på forsiden)
  plus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: color.bgSurface,
    backgroundColor: color.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { gap: 2, marginTop: -4 },
  settings: { alignSelf: 'flex-start', marginTop: -6, marginRight: -6 },
  userRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 4 },
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
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: color.bgApp,
  },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 4, backgroundColor: color.borderDefault },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
});
