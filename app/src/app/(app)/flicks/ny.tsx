import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { CreateButton, CreateShell, createField, OptionRow } from '@/components/CreateFlow';
import { CreateTagInput } from '@/components/CreateTagInput';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { uploadVideo } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

type Captured = { uri: string; mime: string };

/**
 * Ny flick i to trin (samme udtryk som oprettelsen af en konto):
 * 1. Optag med telefonens kamera eller vælg en video.
 * 2. Tekst, tags (mindst ét) og "Del flick".
 */
export default function NewFlick() {
  const me = useMe();
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [videoOnly, setVideoOnly] = useState(false);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState(false);

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
      const { error } = await supabase.from('posts').insert({ author_id: me.id, kind: 'flick', media_type: 'video', image_paths: [path], text: text.trim(), tags });
      if (error) throw error;
      router.replace('/flicks');
    } catch {
      setError('Flicken kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };

  /* Trin 2: tekst, tags og del */
  if (captured) {
    return (
      <CreateShell
        kind="flick"
        progress={[2, 2]}
        kicker="Trin 2 af 2"
        title="Gør den klar"
        lead="Vælg mindst ét tag, så andre kan finde din flick."
        onClose={() => setCaptured(null)}
        closeIcon="chevron-left"
        closeLabel="Tilbage"
        footer={
          <>
            {!!error && (
              <T v="bodyS" c={color.danger} accessibilityLiveRegion="polite">
                {error}
              </T>
            )}
            <CreateButton loading={busy} disabled={tags.length === 0} onPress={share}>
              {tags.length === 0 ? 'Tilføj et tag for at dele' : 'Del flick'}
            </CreateButton>
          </>
        }
      >
        {/* Videoen lille til venstre og teksten ved siden af, så tags kan ses uden at rulle */}
        <View style={s.row}>
          <View style={s.thumb}>
            <LocalVideo uri={captured.uri} />
          </View>
          <TextInput
            accessibilityLabel="Skriv en tekst"
            placeholder="Skriv en tekst …"
            placeholderTextColor={color.textSecondary}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            multiline
            maxLength={300}
            style={[createField.box, s.text, focus && createField.focus, noOutline]}
          />
        </View>
        <CreateTagInput
          flow
          tags={tags}
          onTags={(t) => {
            setTags(t);
            if (t.length) setTagError(false);
          }}
          error={tagError}
          required
        />
      </CreateShell>
    );
  }

  /* Trin 1: optag eller vælg en video */
  return (
    <CreateShell kind="flick" switchable kicker="Trin 1 af 2" title="Ny flick" lead="Flicks er lodrette videoer på op til 60 sekunder." onClose={close}>
      <View style={s.list}>
        <OptionRow icon="camera" title="Optag en video" text="Brug telefonens kamera" onPress={camera} />
        <OptionRow icon="image" title="Vælg en video" text="Fra dit kamerarul" onPress={gallery} />
      </View>
      {videoOnly && (
        <T v="bodyS" c={color.danger} accessibilityLiveRegion="polite">
          Flicks er videoer. Vælg eller optag en video.
        </T>
      )}
    </CreateShell>
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
  list: { gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  thumb: { width: 96, aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: 16, backgroundColor: color.ink900 },
  text: { flex: 1, alignSelf: 'auto', minHeight: 0 },
});
