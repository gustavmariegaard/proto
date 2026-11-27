import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { supabase } from '@/lib/supabase';
import { T } from './T';

/** Midlertidigt link til en video i den private media-mappe (virker både på telefon og web) */
const cache = new Map<string, { url: string; until: number }>();
export async function signedVideoUrl(path: string) {
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data } = await supabase.storage.from('media').createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

type Props = {
  /** Stien i media-mappen */
  path: string;
  /** Kun den synlige video spiller */
  active: boolean;
  style?: ViewStyle;
  contentFit?: 'cover' | 'contain';
};

/**
 * Video, der spiller i loop uden lyd, når den er synlig. Tryk slår lyden til og fra.
 * Bruges i Flicks (og kan bruges i moments).
 */
export function VideoView({ path, active, style, contentFit = 'cover' }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  // Kort besked "Lyd til"/"Lyd fra", når man trykker
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [flash]);
  useEffect(() => {
    let alive = true;
    signedVideoUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      {url && <Player url={url} active={active} muted={muted} contentFit={contentFit} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Slå lyd til' : 'Slå lyd fra'}
        onPress={() => {
          setMuted((m) => !m);
          setFlash(true);
        }}
        style={StyleSheet.absoluteFill}
      />
      {flash && (
        <View style={[s.sound, { pointerEvents: 'none' }]}>
          <T v="label" c="#fff">
            {muted ? 'Lyd fra' : 'Lyd til'}
          </T>
        </View>
      )}
    </View>
  );
}

function Player({ url, active, muted, contentFit }: { url: string; active: boolean; muted: boolean; contentFit: 'cover' | 'contain' }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [player, active]);
  return <ExpoVideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      nativeControls={false}
      // Spil i feedet – ikke i fuldskærm (iPhone/Safari åbner ellers fuldskærm)
      playsInline
      fullscreenOptions={{ enable: false }}
    />;
}

const s = StyleSheet.create({
  sound: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
