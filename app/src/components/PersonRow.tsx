import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { T } from './T';

/** Række med en person: billede, navn og @brugernavn – plus knapper til højre */
export function PersonRow({ name, username, avatar, children, link = true }: { name: string; username: string; avatar?: string | null; children?: ReactNode; link?: boolean }) {
  return (
    <View style={s.row}>
      <Pressable
        accessibilityRole={link ? 'link' : undefined}
        disabled={!link}
        onPress={() => router.push(`/bruger/${username}`)}
        style={s.who}
      >
        <Avatar name={name} path={avatar} />
        <View style={{ flex: 1 }}>
          <T v="headingS" numberOfLines={1}>
            {name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={1}>
            @{username}
          </T>
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
});
