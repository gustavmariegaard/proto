import { router } from 'expo-router';
import type { Profile } from '@/lib/types';
import { Pressable, StyleSheet, View } from 'react-native';
import { color } from '@/theme/tokens';
import { Button } from './Button';
import { MintTile } from './CreateFlow';
import { Icon } from './Icon';
import { T } from './T';
import { Glass } from './Glass';
import { IconButton } from './IconButton';
import { ProfileBadge, ProfileCard } from './ProfileCard';

type Props = {
  me: Pick<Profile, 'name' | 'username' | 'bio' | 'avatar_path' | 'is_private'>;
  /** Du har et aktivt moment: grøn ring, og et tryk åbner det. Ellers et plus, der laver et nyt. */
  hasMoment: boolean;
  onRing: () => void;
  posts: number;
  followers: number;
  following: number;
};

/** Toppen af din egen profil: profilkortet med Indstillinger på banneret og "Rediger profil" ved billedet */
export function ProfileHeader({ me, hasMoment, onRing, posts, followers, following }: Props) {
  return (
    <ProfileCard
      name={me.name}
      username={me.username}
      avatarPath={me.avatar_path}
      ring={hasMoment ? 'new' : 'none'}
      plus={!hasMoment}
      onRing={onRing}
      ringLabel={hasMoment ? 'Se dit moment' : 'Del et moment'}
      badges={
        me.is_private ? (
          <ProfileBadge icon="lock" onPress={() => router.push('/indstillinger/privatliv')}>
            Privat
          </ProfileBadge>
        ) : undefined
      }
      bio={me.bio}
      stats={[
        { n: posts, label: 'Opslag' },
        { n: followers, label: 'Følgere' },
        { n: following, label: 'Følger' },
      ]}
      corner={
        <Glass style={{ borderRadius: 999 }}>
          <IconButton icon="settings" label="Indstillinger" onPress={() => router.push('/indstillinger')} />
        </Glass>
      }
      footer={
        <Pressable accessibilityRole="link" onPress={() => router.push('/indsigt')} style={({ pressed }) => [st.insight, pressed && { opacity: 0.7 }]}>
          <MintTile icon="chart" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="headingS">Indsigt</T>
            <T v="caption" c={color.textSecondary}>
              Se, hvem du når, og hvordan dine opslag klarer sig
            </T>
          </View>
          <Icon name="chevron-right" size={18} color={color.textSecondary} />
        </Pressable>
      }
      action={
        <Button variant="secondary" icon="edit" onPress={() => router.push('/rediger-profil')} style={{ minHeight: 40, paddingHorizontal: 16 }}>
          Rediger profil
        </Button>
      }
    />
  );
}

const st = StyleSheet.create({
  insight: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.borderDefault },
});
