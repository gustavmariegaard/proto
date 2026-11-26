import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { Icon } from './Icon';
import type { PostCard } from '@/lib/types';
import { color } from '@/theme/tokens';
import { T } from './T';

/** Kvadratisk gitter med 3 kolonner. Opslag uden billede vises som en tekstflise. */
export function PostGrid({ posts }: { posts: PostCard[] }) {
  return (
    <View style={s.grid}>
      {posts.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="link"
          accessibilityLabel={p.text ? `Opslag: ${p.text.slice(0, 60)}` : 'Opslag med billede'}
          onPress={() => router.push(p.kind === 'flick' ? `/flicks?vis=${p.id}` : `/opslag/${p.id}`)}
          style={s.cell}
        >
          {p.image_paths[0] && p.media_type === 'video' ? (
            <View style={[s.fill, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="clip" size={24} color={color.white} />
            </View>
          ) : p.image_paths[0] ? (
            <Image source={imageSource(p.image_paths[0])} style={s.fill} contentFit="cover" transition={150} />
          ) : (
            <View style={[s.fill, s.text]}>
              <T v="caption" numberOfLines={5}>
                {p.text}
              </T>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -1 },
  cell: { width: '33.333%', aspectRatio: 1, padding: 1 },
  fill: { flex: 1, backgroundColor: color.bgSubtle },
  text: { padding: 8, justifyContent: 'center', backgroundColor: color.bgSurface, borderWidth: 1, borderColor: color.borderDefault },
});
