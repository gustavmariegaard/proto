import { Image } from 'expo-image';
import { router } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { signedVideoUrl } from './VideoView';
import { imageSource } from '@/lib/media';
import { fmtCount } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { Icon } from './Icon';
import { T } from './T';

/** Flicks på en profil: høje fliser i 3 kolonner. Tryk åbner flicken i Flicks. */
export function FlickGrid({ flicks }: { flicks: PostCard[] }) {
  return (
    <View style={s.grid}>
      {flicks.map((f) => (
        <Pressable key={f.id} accessibilityRole="link" accessibilityLabel={`Flick: ${f.text || 'uden tekst'}`} onPress={() => router.push(`/flicks?vis=${f.id}`)} style={s.cell}>
          <View style={s.fill}>
            {f.media_type === 'image' && f.image_paths[0] ? (
              <Image source={imageSource(f.image_paths[0])} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <VideoThumb path={f.image_paths[0]} />
            )}
            <View style={s.likes}>
              <Icon name="heart" size={14} color="#fff" />
              <T v="captionStrong" c="#fff">
                {fmtCount(f.likes)}
              </T>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -1 },
  cell: { width: '33.333%', aspectRatio: 9 / 16, padding: 1 },
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
  video: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1c1c1c' },
  likes: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
});

/** Videoens første billede som flise (web). Telefonen viser et ikon, indtil miniaturer gemmes. */
function VideoThumb({ path }: { path?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !path) return;
    let alive = true;
    signedVideoUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  if (Platform.OS === 'web' && url) {
    return createElement('video', {
      src: `${url}#t=0.1`,
      muted: true,
      playsInline: true,
      preload: 'metadata',
      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' },
    });
  }
  return (
    <View style={s.video}>
      <Icon name="video" size={26} color="rgba(255,255,255,0.8)" />
    </View>
  );
}
