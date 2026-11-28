import { router } from 'expo-router';
import type { Profile } from '@/lib/types';
import { Button } from './Button';
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
  /** Tryk på navnet: skift mellem din profil og dine sider */
  onSwitch?: () => void;
};

/** Toppen af din egen profil: profilkortet med Indstillinger på banneret og "Rediger profil" ved billedet */
export function ProfileHeader({ me, hasMoment, onRing, posts, followers, following, onSwitch }: Props) {
  return (
    <ProfileCard
      name={me.name}
      username={me.username}
      avatarPath={me.avatar_path}
      ring={hasMoment ? 'new' : 'none'}
      plus={!hasMoment}
      onRing={onRing}
      ringLabel={hasMoment ? 'Se dit moment' : 'Del et moment'}
      onSwitch={onSwitch}
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
        { n: followers, label: 'Følgere', onPress: () => router.push({ pathname: '/forbindelser', params: { bruger: me.username } }) },
        { n: following, label: 'Følger', onPress: () => router.push({ pathname: '/forbindelser', params: { bruger: me.username, fane: 'foelger' } }) },
      ]}
      corner={
        <Glass style={{ borderRadius: 999 }}>
          <IconButton icon="settings" label="Indstillinger" onPress={() => router.push('/indstillinger')} />
        </Glass>
      }
      action={
        <Button variant="secondary" icon="edit" onPress={() => router.push('/rediger-profil')} style={{ minHeight: 40, paddingHorizontal: 16 }}>
          Rediger profil
        </Button>
      }
    />
  );
}

