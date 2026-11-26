import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PageCard } from '@/lib/community';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { T } from './T';

/** Side i en liste: billede, navn, kategori og antal følgere */
export function PageRow({ page, children }: { page: PageCard; children?: ReactNode }) {
  return (
    <View style={s.row}>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/sider/${page.handle}`)} style={s.who}>
        <Avatar name={page.name} path={page.avatar_path} />
        <View style={{ flex: 1 }}>
          <T v="headingS" numberOfLines={1}>
            {page.name}
          </T>
          <T v="caption" c={color.textSecondary} numberOfLines={1}>
            {[page.category, `${page.followers} ${page.followers === 1 ? 'følger' : 'følgere'}`].filter(Boolean).join(' · ')}
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
