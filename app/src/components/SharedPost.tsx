import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { getPost } from '@/lib/posts';
import { ago } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { color, radius } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';

/**
 * Et delt opslag vist som et lille kort: inde i et andet opslag ("Del som opslag")
 * og i en besked ("Del som besked"). Kan man ikke længere se det, står der det.
 */
export function SharedPost({ id, compact, onDark }: { id: string; compact?: boolean; onDark?: boolean }) {
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  useEffect(() => {
    getPost(id).then(setPost);
  }, [id]);

  if (post === undefined) return <View style={[s.card, compact && s.compact, { minHeight: 56 }]} />;
  if (post === null) {
    return (
      <View style={[s.card, compact && s.compact]}>
        <T v="caption" c={color.textSecondary}>
          Opslaget er ikke længere tilgængeligt.
        </T>
      </View>
    );
  }
  const name = post.page_name ?? post.author_name;
  const open = () => router.push(post.kind === 'flick' ? `/flicks?vis=${post.id}` : `/opslag/${post.id}`);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Delt opslag fra ${name}`} onPress={open} style={({ pressed }) => [s.card, compact && s.compact, onDark && s.onDark, pressed && { opacity: 0.8 }]}>
      <View style={s.head}>
        <Avatar name={name} path={post.page_avatar_path ?? post.author_avatar_path} size="S" />
        <T v="captionStrong" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </T>
        <T v="caption" c={color.textSecondary}>
          {ago(post.created_at)}
        </T>
      </View>
      {!!post.text && (
        <T v="bodyS" numberOfLines={compact ? 3 : 6}>
          {post.text}
        </T>
      )}
      {post.image_paths[0] &&
        (post.media_type === 'video' ? (
          <View style={[s.media, s.video]}>
            <Icon name="clip" size={28} color={color.white} />
          </View>
        ) : (
          <Image source={imageSource(post.image_paths[0])} style={s.media} contentFit="cover" transition={150} />
        ))}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { gap: 8, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  compact: { padding: 10, maxWidth: 280 },
  onDark: { borderColor: 'transparent' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  media: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  video: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
});
