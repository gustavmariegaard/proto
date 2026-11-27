import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { T } from '@/components/T';
import { imageSource, pickMedia, uploadImage, uploadVideo } from '@/lib/media';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { useDarkChrome } from '@/lib/useDarkChrome';
import { color, radius } from '@/theme/tokens';

type Captured = { uri: string; mime: string; video: boolean };

/**
 * Nyt moment. Forsvinder efter 24 timer. ?side=<id> laver det som en side, du er admin for.
 * - Uden ?opslag: prototypens "Nyt moment" (NewFlick som moment): tag et foto/en video eller vælg fra billeder, og del.
 * - ?opslag=<id>: prototypens "Del som moment" (MomentComposer): opslaget som kort i fuld skærm.
 */
export default function NewMoment() {
  const { opslag } = useLocalSearchParams<{ opslag?: string; side?: string }>();
  return opslag ? <ShareMoment postId={opslag} /> : <Camera />;
}

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

function useShare() {
  const me = useMe();
  const { side } = useLocalSearchParams<{ side?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const share = async (media: Captured | null, postId: string | null) => {
    setBusy(true);
    setError('');
    try {
      const media_path = media ? (media.video ? await uploadVideo(me.id, media.uri, media.mime) : await uploadImage(me.id, media.uri, media.mime, 'opslag')) : null;
      const { error } = await supabase.from('moments').insert({
        author_id: me.id,
        page_id: side ?? null,
        post_id: postId,
        media_path,
        media_type: media?.video ? 'video' : 'image',
        text: '',
      });
      if (error) throw error;
      router.replace('/');
    } catch {
      setError('Momentet kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };
  return { busy, error, share };
}

/* ---------- Nyt moment (søgeren) ---------- */

function Camera() {
  useDarkChrome();
  const insets = useSafeAreaInsets();
  const [captured, setCaptured] = useState<Captured | null>(null);
  const { busy, error, share } = useShare();

  const fromAsset = (a: ImagePicker.ImagePickerAsset | null | undefined) => {
    if (!a) return;
    const video = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
    setCaptured({ uri: a.uri, mime: a.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'), video });
  };
  // Telefonens eget kamera (på web: filvælgeren med kamera)
  const camera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (perm && !perm.granted) return fromAsset(await pickMedia(true));
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8, videoMaxDuration: 60 }).catch(() => null);
    if (res && !res.canceled) fromAsset(res.assets?.[0]);
  };
  const gallery = async () => fromAsset(await pickMedia(true));

  return (
    <View style={[s.newflick, { paddingTop: insets.top }]} accessibilityLabel="Nyt moment">
      <StatusBar style="light" />
      <View style={s.viewfinder}>
        {captured ? (
          captured.video ? (
            <LocalVideo uri={captured.uri} />
          ) : (
            <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Dit billede" />
          )
        ) : (
          <>
            <View style={s.placeholder} />
            <T v="bodyS" c={color.bgSubtle} style={s.hint} accessibilityLiveRegion="polite">
              Tryk for foto. Hold nede for at optage.
            </T>
          </>
        )}

        <View style={s.top}>
          <IconButton icon="close" label={captured ? 'Kassér' : 'Luk'} tint={color.white} onPress={() => (captured ? setCaptured(null) : close())} />
          <T v="headingS" c={color.white} style={s.title} accessibilityRole="header">
            Nyt moment
          </T>
          <View style={{ width: 44 }} />
        </View>

        {!captured && (
          <View style={[s.controls, { bottom: Math.max(70, insets.bottom + 40) }]}>
            <IconButton icon="image" label="Vælg fra billeder" tint={color.white} onPress={gallery} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tag foto"
              onPress={camera}
              style={({ pressed }) => [s.shutter, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <View style={s.shutterInner} />
            </Pressable>
            <IconButton icon="camera" label="Skift kamera" tint={color.white} onPress={camera} />
          </View>
        )}
      </View>

      {captured && (
        <View style={[s.panel, { paddingBottom: 16 + insets.bottom }]}>
          {!!error && (
            <T v="bodyS" c={color.danger}>
              {error}
            </T>
          )}
          <Button variant="highlight" block loading={busy} onPress={() => share(captured, null)}>
            Del moment
          </Button>
        </View>
      )}
    </View>
  );
}

/** Den valgte video (fra telefonen) */
function LocalVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <ExpoVideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} accessibilityLabel="Din video" />;
}

/* ---------- Del som moment ---------- */

function ShareMoment({ postId }: { postId: string }) {
  useDarkChrome();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const { busy, error, share } = useShare();

  useEffect(() => {
    getPost(postId).then(setPost);
  }, [postId]);

  const image = post && post.media_type !== 'video' ? post.image_paths[0] : undefined;

  return (
    <View style={s.smoment} accessibilityLabel="Del som moment">
      <StatusBar style="light" />
      {/* Baggrund: opslagets billede sløret, ellers sort */}
      <View style={s.stage}>
        {image && <Image source={imageSource(image)} style={s.stagePhoto} contentFit="cover" blurRadius={28} />}
        {image && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />}
        {post && (
          <View style={s.card}>
            <View style={s.quote}>
              <View style={s.quoteHead}>
                <Avatar name={post.author_name} path={post.author_avatar_path} size="S" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="headingS" numberOfLines={1}>
                    {post.author_name}
                  </T>
                  <T v="caption" c={color.textSecondary} numberOfLines={1}>
                    @{post.author_username}
                  </T>
                </View>
              </View>
              {!!post.text && <T v="bodyS">{post.text}</T>}
              {!!image && <Image source={imageSource(image)} style={s.quoteImg} contentFit="cover" />}
            </View>
          </View>
        )}
        {post === null && (
          <T v="bodyS" c={color.white}>
            Opslaget findes ikke længere.
          </T>
        )}
      </View>

      <View style={[s.smTop, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="close" label="Tilbage" tint={color.white} onPress={close} style={s.smBtn} />
        <View style={s.smWho}>
          <Avatar name={me.name} path={me.avatar_path} size="S" />
          <T v="captionStrong" c={color.white} numberOfLines={1} style={{ flexShrink: 1 }}>
            @{me.username}
          </T>
        </View>
      </View>

      <View style={[s.smBottom, { paddingBottom: insets.bottom + 12 }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="smFade" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#000" stopOpacity={0.45} />
                <Stop offset="1" stopColor="#000" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#smFade)" />
          </Svg>
        </View>
        {!!error && (
          <T v="bodyS" c={color.white}>
            {error}
          </T>
        )}
        <Button variant="highlight" block loading={busy} disabled={!post} onPress={() => share(null, postId)}>
          Del som moment
        </Button>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  /* Nyt moment */
  newflick: { flex: 1, backgroundColor: color.actionPrimary },
  viewfinder: { flex: 1, overflow: 'hidden', backgroundColor: color.actionPrimary },
  placeholder: { position: 'absolute', left: '50%', top: '44%', width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: 110, backgroundColor: color.ink700, opacity: 0.75 },
  hint: { position: 'absolute', left: 16, right: 16, top: '44%', marginTop: -20, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  top: { position: 'absolute', top: 18, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  controls: { position: 'absolute', left: 60, right: 60, minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: color.accentHighlight, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.bgSurface },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: color.bgSurface,
  },
  /* Del som moment */
  smoment: { flex: 1, backgroundColor: color.ink900 },
  stage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: color.ink900 },
  stagePhoto: { position: 'absolute', top: -40, left: -40, right: -40, bottom: -40 },
  card: { width: '86%', maxWidth: 360, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', borderRadius: radius.lg },
  quote: { gap: 6, padding: 12, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg, backgroundColor: color.bgSurface },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quoteImg: { width: '100%', height: 260, maxHeight: 260, borderRadius: radius.md },
  smTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  smBtn: { backgroundColor: 'rgba(0,0,0,0.25)' },
  smWho: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  smBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10, paddingTop: 12, paddingHorizontal: 16 },
});
