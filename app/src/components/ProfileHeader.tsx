import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ProfileView } from '@/lib/profiles';
import { fmtNumber } from '@/lib/time';
import { color } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';

/** Toppen af en profil: billede, navn, @brugernavn, bio og tal. Knapper sendes ind som children. */
export function ProfileHeader({ p, children }: { p: Pick<ProfileView, 'name' | 'username' | 'bio' | 'avatar_path' | 'public_kind' | 'posts' | 'followers' | 'following'>; children?: ReactNode }) {
  return (
    <View style={s.wrap}>
      <Avatar name={p.name} path={p.avatar_path} size={96} />
      <View style={s.nameRow}>
        <T v="titleL" accessibilityRole="header">
          {p.name}
        </T>
        {p.public_kind && <Icon name={p.public_kind === 'side' ? 'building' : 'globe'} size={16} color={color.green700} />}
      </View>
      <T v="bodyS" c={color.textSecondary}>
        @{p.username}
      </T>
      {!!p.bio && (
        <T v="bodyS" style={s.bio}>
          {p.bio}
        </T>
      )}
      <View style={s.stats}>
        <Stat n={p.posts} label="Opslag" />
        <Stat n={p.followers} label="Følgere" />
        <Stat n={p.following} label="Følger" />
      </View>
      {children}
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
  wrap: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  bio: { textAlign: 'center', marginTop: 4, maxWidth: 320 },
  stats: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-around', marginTop: 12, marginBottom: 8 },
  stat: { alignItems: 'center', minWidth: 80 },
});
