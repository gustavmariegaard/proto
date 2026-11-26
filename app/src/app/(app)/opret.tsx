import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { T } from '@/components/T';
import { Toggle } from '@/components/Toggle';
import { pickImage, uploadImage } from '@/lib/media';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { color, font, radius, TAP } from '@/theme/tokens';

const MAX_IMAGES = 4;
const MAX_TAGS = 5;
const MAX_TEXT = 2200;

/** Opret et opslag: tekst, billeder, Offentlig debat med tags og "Tillad deling" */
export default function Create() {
  const me = useMe();
  // Opslag i en gruppe, en begivenhed eller som en side (?gruppe= | ?begivenhed= | ?side=)
  const params = useLocalSearchParams<{ gruppe?: string; begivenhed?: string; side?: string }>();
  const where = params.gruppe ? { col: 'group_id', id: params.gruppe } : params.begivenhed ? { col: 'event_id', id: params.begivenhed } : params.side ? { col: 'page_id', id: params.side } : null;
  const [placeName, setPlaceName] = useState<string | null>(null);
  useEffect(() => {
    if (!where) return;
    const q =
      where.col === 'group_id'
        ? supabase.from('groups').select('name').eq('id', where.id).maybeSingle()
        : where.col === 'event_id'
          ? supabase.from('events').select('name:title').eq('id', where.id).maybeSingle()
          : supabase.from('pages').select('name').eq('id', where.id).maybeSingle();
    q.then(({ data }) => setPlaceName((data as { name?: string } | null)?.name ?? null));
  }, [where?.col, where?.id]);
  const [text, setText] = useState('');
  const [images, setImages] = useState<{ uri: string; mime: string }[]>([]);
  const [debate, setDebate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const hasContent = text.trim().length > 0 || images.length > 0;
  const canPost = hasContent && (!debate || tags.length > 0) && !busy;

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || tags.length >= MAX_TAGS) return;
    const nice = t.charAt(0).toUpperCase() + t.slice(1);
    if (!tags.some((x) => x.toLowerCase() === nice.toLowerCase())) setTags([...tags, nice.slice(0, 40)]);
    setTagText('');
  };

  const q = tagText.trim().replace(/^#/, '').toLowerCase();
  const suggestions = allTopics.filter((t) => !tags.includes(t) && (!q || t.toLowerCase().includes(q))).slice(0, 8);

  const publish = async () => {
    if (!canPost) return;
    setBusy(true);
    setError('');
    try {
      const image_paths: string[] = [];
      for (const im of images) image_paths.push(await uploadImage(me.id, im.uri, im.mime));
      const { error } = await supabase.from('posts').insert({
        author_id: me.id,
        kind: debate ? 'debat' : 'feed',
        text: text.trim(),
        image_paths,
        tags: debate ? tags : [],
        allow_share: share,
        ...(where ? { [where.col]: where.id } : {}),
      });
      if (error) throw error;
      close();
      // I en gruppe/begivenhed/side: tilbage dertil. Ellers til feedet.
      if (!where) router.navigate(debate ? '/debat' : '/');
    } catch {
      setError('Opslaget kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <IconButton icon="close" label="Luk" outline onPress={close} />
          <T v="titleL" style={{ flex: 1 }} accessibilityRole="header">
            Opret
          </T>
          <Button title="Del" disabled={!canPost} loading={busy} onPress={publish} style={{ minHeight: TAP, paddingHorizontal: 18 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {where && (
            <View style={s.place}>
              <Icon name={where.col === 'group_id' ? 'circles' : where.col === 'event_id' ? 'calendar' : 'building'} size={18} />
              <T v="label" numberOfLines={1} style={{ flex: 1 }}>
                {where.col === 'page_id' ? 'Deles som' : 'Deles i'} {placeName ?? '…'}
              </T>
            </View>
          )}
          <View style={s.writer}>
            <TextInput
              style={s.text}
              placeholder="Hvad vil du dele?"
              placeholderTextColor={color.textSecondary}
              accessibilityLabel="Tekst"
              multiline
              maxLength={MAX_TEXT}
              value={text}
              onChangeText={setText}
              autoFocus
            />
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {images.map((im, i) => (
                  <View key={im.uri} style={s.thumb}>
                    <Image source={{ uri: im.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Fjern billede ${i + 1}`}
                      onPress={() => setImages((l) => l.filter((_, j) => j !== i))}
                      style={s.remove}
                    >
                      <View style={s.removeDot}>
                        <Icon name="close" size={14} color={color.white} />
                      </View>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            {images.length < MAX_IMAGES && (
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  const a = await pickImage();
                  if (a) setImages((l) => [...l, { uri: a.uri, mime: a.mimeType ?? 'image/jpeg' }].slice(0, MAX_IMAGES));
                }}
                style={s.addImage}
              >
                <Icon name="image" size={20} />
                <T v="label">{images.length ? 'Tilføj flere billeder' : 'Tilføj billede'}</T>
              </Pressable>
            )}
          </View>

          {!where && <Toggle title="Offentlig debat" hint="Til alle" value={debate} onChange={setDebate} />}

          {debate && (
            <View style={s.tagsBox}>
              <T v="headingS">Tags</T>
              {tags.length > 0 && (
                <View style={s.wrap}>
                  {tags.map((t) => (
                    <Chip key={t} label={`#${t}`} selected small trailing="close" onPress={() => setTags(tags.filter((x) => x !== t))} />
                  ))}
                </View>
              )}
              {tags.length < MAX_TAGS && (
                <TextInput
                  style={s.tagInput}
                  placeholder="Tilføj tag"
                  placeholderTextColor={color.textSecondary}
                  accessibilityLabel="Tilføj tag"
                  autoCapitalize="sentences"
                  value={tagText}
                  onChangeText={(t) => (t.endsWith(',') ? addTag(t.slice(0, -1)) : setTagText(t))}
                  onSubmitEditing={() => addTag(tagText)}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
              )}
              {tags.length < MAX_TAGS && suggestions.length > 0 && (
                <View style={s.wrap}>
                  {suggestions.map((t) => (
                    <Chip key={t} label={t} small onPress={() => addTag(t)} />
                  ))}
                </View>
              )}
              <T v="caption" c={color.textSecondary}>
                Højst {MAX_TAGS} tags pr. opslag
              </T>
            </View>
          )}

          <Toggle title="Tillad deling" value={share} onChange={setShare} />

          {!!error && (
            <T v="bodyS" c={color.danger}>
              {error}
            </T>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 20, paddingTop: 8, gap: 14, paddingBottom: 40 },
  writer: {
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  text: { minHeight: 120, color: color.textPrimary, fontFamily: font.body, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  thumb: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bgSubtle },
  remove: { position: 'absolute', top: 0, right: 0, width: TAP, height: TAP, alignItems: 'flex-end', padding: 6 },
  removeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  addImage: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TAP, alignSelf: 'flex-start' },
  tagsBox: {
    gap: 10,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TAP, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.noteBg },
  tagInput: {
    minHeight: TAP + 4,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderDefault,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
  },
});
