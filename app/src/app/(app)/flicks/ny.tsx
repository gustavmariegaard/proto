import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { CreateTagInput } from '@/components/CreateTagInput';
import { IconButton } from '@/components/IconButton';
import { T } from '@/components/T';
import { uploadVideo } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useBlackChrome } from '@/lib/useDarkChrome';
import { color, font, palette } from '@/theme/tokens';

type Captured = { uri: string; mime: string };

/**
 * Ny flick (prototypens NewFlick): mørk søger i fuld skærm.
 * Udløseren åbner telefonens kamera (flicks er videoer), billedikonet vælger en video.
 * Efter optagelse: tags og "Del flick".
 */
export default function NewFlick() {
  useBlackChrome();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [videoOnly, setVideoOnly] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/flicks'));

  const take = (res: ImagePicker.ImagePickerResult) => {
    const a = !res.canceled ? res.assets?.[0] : undefined;
    if (!a) return;
    const isVideo = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
    // Flicks er videoer (som Reels)
    if (!isVideo) {
      setVideoOnly(true);
      return;
    }
    setVideoOnly(false);
    setCaptured({ uri: a.uri, mime: a.mimeType ?? 'video/mp4' });
  };

  const camera = async () => {
    if (Platform.OS !== 'web') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) return;
    }
    take(await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium }));
  };

  const gallery = async () => {
    take(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 60, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium }));
  };

  const share = async () => {
    if (!captured || busy) return;
    if (tags.length === 0) {
      setTagError(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const path = await uploadVideo(me.id, captured.uri, captured.mime);
      const { error } = await supabase.from('posts').insert({ author_id: me.id, kind: 'flick', media_type: 'video', image_paths: [path], text: '', tags });
      if (error) throw error;
      router.replace('/flicks');
    } catch {
      setError('Flicken kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]} accessibilityViewIsModal accessibilityLabel="Ny flick">
      <StatusBar style="light" />
      <View style={s.viewfinder}>
        {captured ? (
          <LocalVideo uri={captured.uri} />
        ) : (
          <>
            <View style={s.placeholder} />
            <T v="bodyS" c={videoOnly ? color.accentHighlight : color.bgSubtle} style={[s.hint, videoOnly && { fontFamily: font.bodySemi }]} accessibilityLiveRegion="polite">
              {videoOnly ? 'Flicks er videoer. Hold knappen nede for at optage.' : 'Hold nede for at optage en flick.'}
            </T>
          </>
        )}

        <View style={s.top}>
          <IconButton icon="close" label={captured ? 'Kassér' : 'Luk'} tint={color.textOnAction} onPress={() => (captured ? setCaptured(null) : close())} />
          <T v="headingS" c="#fff" style={s.title}>
            Ny flick
          </T>
          <View style={{ width: 44 }} />
        </View>

        {!captured && (
          <View style={[s.controls, { bottom: Math.max(70, insets.bottom + 40) }]}>
            <IconButton icon="image" label="Vælg video" tint={color.textOnAction} onPress={gallery} />
            <Pressable accessibilityRole="button" accessibilityLabel="Hold nede for at optage" onPress={camera} onLongPress={camera} style={s.shutter}>
              {({ pressed }) => <View style={[s.shutterInner, pressed && { transform: [{ scale: 0.92 }] }]} />}
            </Pressable>
            <IconButton icon="camera" label="Skift kamera" tint={color.textOnAction} onPress={camera} />
          </View>
        )}
      </View>

      {/* Efter optagelse: tilføj tags, og del */}
      {captured && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.panelWrap}>
          <ScrollView style={s.panel} contentContainerStyle={[s.panelContent, { paddingBottom: 16 + insets.bottom }]} keyboardShouldPersistTaps="handled">
            <CreateTagInput
              tags={tags}
              onTags={(t) => {
                setTags(t);
                if (t.length) setTagError(false);
              }}
              error={tagError}
              hint="Fx #Dans eller #Cykelstier, så andre kan finde den."
            />
            {!!error && (
              <T v="bodyS" c={color.danger}>
                {error}
              </T>
            )}
            <Button variant="highlight" block loading={busy} onPress={share}>
              Del flick
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

/** Den optagne eller valgte video, i fuld skærm */
function LocalVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <ExpoVideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} accessibilityLabel="Din video" />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.actionPrimary },
  viewfinder: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: color.actionPrimary },
  /* Grå cirkel, 220 px, når der ikke er et kamerabillede */
  placeholder: { position: 'absolute', alignSelf: 'center', top: '44%', marginTop: -110, width: 220, height: 220, borderRadius: 110, backgroundColor: palette.ink700, opacity: 0.75 },
  hint: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '44%',
    marginTop: -20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  top: { position: 'absolute', top: 18, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  /* Udløser og knapper: 70 px fra bunden, ikonerne 60 px fra kanterne */
  controls: { position: 'absolute', left: 60, right: 60, minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  /* Mint ring (76 px) med hvid knap (56 px) indeni */
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: color.accentHighlight, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.bgSurface },
  panelWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '62%', zIndex: 5 },
  panel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: color.bgSurface },
  panelContent: { gap: 12, paddingTop: 16, paddingHorizontal: 20 },
});
