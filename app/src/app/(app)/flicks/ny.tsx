import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { pickMedia, uploadImage, uploadVideo } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { useDarkChrome } from '@/lib/useDarkChrome';
import { font, radius, TAP } from '@/theme/tokens';

const MAX_TAGS = 5;
const MAX_TEXT = 300;
const MUTED = 'rgba(255,255,255,0.6)';

type Picked = { uri: string; type: 'video' | 'image'; mime: string };

/** Ny flick: vælg video (eller billede), skriv en tekst og vælg op til 5 tags */
export default function NewFlick() {
  useDarkChrome();
  const me = useMe();
  const [media, setMedia] = useState<Picked | null>(null);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Lodret forhåndsvisning (9:16)
  const { width: screenW } = useWindowDimensions();
  const pw = Math.min(screenW * 0.5, 220);

  const choose = async () => {
    const a = await pickMedia(true);
    if (!a) return;
    const isVideo = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
    setMedia({ uri: a.uri, type: isVideo ? 'video' : 'image', mime: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg') });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || tags.length >= MAX_TAGS) return;
    const nice = t.charAt(0).toUpperCase() + t.slice(1);
    if (!tags.some((x) => x.toLowerCase() === nice.toLowerCase())) setTags([...tags, nice]);
    setTagInput('');
  };

  const q = tagInput.trim().toLowerCase();
  const suggestions = allTopics.filter((t) => !tags.includes(t) && (!q || t.toLowerCase().includes(q))).slice(0, 8);
  const canShare = !!media && tags.length > 0 && !busy;

  const share = async () => {
    if (!media) return;
    setBusy(true);
    setError('');
    try {
      const path = media.type === 'video' ? await uploadVideo(me.id, media.uri, media.mime) : await uploadImage(me.id, media.uri, media.mime);
      const { error } = await supabase.from('posts').insert({
        author_id: me.id,
        kind: 'flick',
        media_type: media.type,
        image_paths: [path],
        text: text.trim(),
        tags,
      });
      if (error) throw error;
      router.replace('/flicks');
    } catch {
      setError('Flicken kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Luk" onPress={() => (router.canGoBack() ? router.back() : router.replace('/flicks'))} style={s.round}>
            <Icon name="close" color="#fff" />
          </Pressable>
          <T v="headingM" c="#fff" accessibilityRole="header">
            Ny flick
          </T>
          <View style={{ width: TAP }} />
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel={media ? 'Skift video' : 'Vælg video'} onPress={choose} style={[s.preview, { width: pw, height: (pw * 16) / 9 }]}>
            {media?.type === 'video' ? (
              <LocalVideo uri={media.uri} />
            ) : media ? (
              <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={s.placeholder}>
                <Icon name="video" size={32} color="#fff" />
                <T v="label" c="#fff">
                  Vælg video
                </T>
              </View>
            )}
          </Pressable>
          {media && (
            <Pressable accessibilityRole="button" onPress={choose} style={s.change}>
              <T v="label" c="#fff" style={{ textDecorationLine: 'underline' }}>
                Skift
              </T>
            </Pressable>
          )}

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Skriv en tekst"
            placeholderTextColor={MUTED}
            accessibilityLabel="Tekst"
            multiline
            maxLength={MAX_TEXT}
            style={[s.text, noOutline]}
          />

          <View style={{ gap: 8 }}>
            <T v="label" c="#fff">
              Tags
            </T>
            {tags.length > 0 && (
              <View style={s.chips}>
                {tags.map((t) => (
                  <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Fjern ${t}`} onPress={() => setTags(tags.filter((x) => x !== t))} style={[s.chip, s.chipOn]}>
                    <T v="label" c="#171717">
                      #{t}
                    </T>
                    <Icon name="close" size={14} color="#171717" />
                  </Pressable>
                ))}
              </View>
            )}
            {tags.length < MAX_TAGS && (
              <TextInput
                value={tagInput}
                onChangeText={(v) => (v.endsWith(',') ? addTag(v.slice(0, -1)) : setTagInput(v))}
                onSubmitEditing={() => addTag(tagInput)}
                placeholder="Tilføj tag"
                placeholderTextColor={MUTED}
                accessibilityLabel="Tilføj tag"
                autoCapitalize="none"
                returnKeyType="done"
                style={[s.tagField, noOutline]}
              />
            )}
            {tags.length < MAX_TAGS && (
              <View style={s.chips}>
                {suggestions.map((t) => (
                  <Pressable key={t} accessibilityRole="button" onPress={() => addTag(t)} style={s.chip}>
                    <T v="label" c="#fff">
                      {t}
                    </T>
                  </Pressable>
                ))}
              </View>
            )}
            <T v="caption" c={MUTED}>
              Højst {MAX_TAGS} tags pr. flick
            </T>
          </View>

          {!!error && (
            <T v="bodyS" c="#ff8a7a">
              {error}
            </T>
          )}
        </ScrollView>

        <View style={{ padding: 16 }}>
          <Button title="Del flick" variant="accent" block disabled={!canShare} loading={busy} onPress={share} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Forhåndsvisning af den valgte video (fra telefonen) */
function LocalVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <ExpoVideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: TAP + 8 },
  round: { width: TAP, height: TAP, borderRadius: TAP / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  body: { padding: 16, gap: 16 },
  preview: { alignSelf: 'center', borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  change: { alignSelf: 'center', minHeight: TAP, justifyContent: 'center', marginTop: -8 },
  text: {
    minHeight: 88,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontFamily: font.body,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  tagField: {
    minHeight: TAP + 4,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontFamily: font.body,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: TAP,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
});

