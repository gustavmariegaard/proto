import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import type { PostCard } from '@/lib/types';
import { fmtCount } from '@/lib/time';
import { color, font, radius } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';

/**
 * Opslag som gitter: tre kolonner i 4:5 som afrundede fliser med luft imellem
 * (samme udtryk som kortene i resten af appen). Tekstopslag er en rolig tekstflise.
 */
export function PostGrid({ posts }: { posts: PostCard[] }) {
  const [w, setW] = useState(0);
  // Tre lige brede kolonner med 6 px imellem
  const cellW = w ? Math.floor(((w - 12) / 3) * 100) / 100 : 0;
  return (
    <View style={s.grid} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {posts.map((p) => {
        const img = p.image_paths[0];
        return (
          <View key={p.id} style={cellW ? { width: cellW } : s.cell}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Opslag: ${(p.text || 'Billede').slice(0, 60)}. ${p.likes} synes godt om`}
              onPress={() => router.push(p.kind === 'flick' ? `/flicks?vis=${p.id}` : `/opslag/${p.id}`)}
              style={({ pressed }) => [s.tile, !img && s.text, pressed && img ? s.pressed : null]}
            >
              {img && p.media_type === 'video' ? (
                <View style={[StyleSheet.absoluteFill, s.video]}>
                  <Icon name="clip" size={24} color={color.white} />
                </View>
              ) : img ? (
                <Image source={imageSource(img)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : (
                <T style={s.textTxt} numberOfLines={5}>
                  {p.text}
                </T>
              )}
              {/* Antal hjerter på hver flise */}
              <View style={[s.likes, img ? s.likesImg : s.likesText]} accessible={false}>
                <Icon name="heart" size={13} color={img ? color.white : color.textSecondary} />
                <T v="captionStrong" c={img ? color.white : color.textSecondary} style={img ? s.shadow : undefined}>
                  {fmtCount(p.likes)}
                </T>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '32%' },
  tile: { aspectRatio: 4 / 5, overflow: 'hidden', borderRadius: radius.md, backgroundColor: color.bgSubtle },
  pressed: { opacity: 0.92 },
  // Tekstopslag: hvid flise med 1 px indvendig kant, teksten i bunden
  text: { justifyContent: 'flex-end', padding: 10, backgroundColor: color.bgSurface, borderWidth: 1, borderColor: color.borderDefault },
  textTxt: { fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 17, color: color.textPrimary },
  likes: { position: 'absolute', left: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  likesImg: { bottom: 6 },
  likesText: { top: 8 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  video: { backgroundColor: color.ink900, alignItems: 'center', justifyContent: 'center' },
});
