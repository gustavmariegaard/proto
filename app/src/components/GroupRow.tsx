import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { GroupCard } from '@/lib/community';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';

/** Gruppe i en liste: billede, navn, synlighed og antal medlemmer */
export function GroupRow({ group, children }: { group: GroupCard; children?: ReactNode }) {
  return (
    <View style={s.row}>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/grupper/${group.id}`)} style={s.who}>
        <Avatar name={group.name} path={group.avatar_path} />
        <View style={{ flex: 1 }}>
          <T v="headingS" numberOfLines={1}>
            {group.name}
          </T>
          <View style={s.meta}>
            {group.privacy === 'privat' && <Icon name="lock" size={12} color={color.textSecondary} />}
            <T v="caption" c={color.textSecondary} numberOfLines={1}>
              {group.privacy === 'privat' ? 'Privat' : 'Offentlig'} · {group.members} {group.members === 1 ? 'medlem' : 'medlemmer'}
            </T>
          </View>
        </View>
      </Pressable>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingLeft: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
