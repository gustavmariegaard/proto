import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { imageSource, pickMedia, uploadImage, uploadVideo } from '@/lib/media';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color, radius } from '@/theme/tokens';

const MAX = 300;

/**
 * Nyt moment: billede eller video og evt. tekst. Forsvinder efter 24 timer.
 * ?opslag=<id> deler et opslag som moment. ?side=<id> laver det som en side, du er admin for.
 */
export default function NewMoment() {
  const me = useMe();
  const { opslag, side } = useLocalSearchParams<{ opslag?: string; side?: string }>();
  const [media, setMedia] = useState<{ uri: string; mime: string; video: boolean } | null>(null);
  const [text, setText] = useState('');
  const [post, setPost] = useState<PostCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (opslag) getPost(opslag).then(setPost);
  }, [opslag]);

  const choose = async () => {
    const a = await pickMedia(true);
    if (!a) return;
    const video = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
    setMedia({ uri: a.uri, mime: a.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'), video });
  };

  const ok = !!media || !!post || text.trim().length > 0;

  const share = async () => {
    setBusy(true);
    setError('');
    try {
      const media_path = media ? (media.video ? await uploadVideo(me.id, media.uri, media.mime) : await uploadImage(me.id, media.uri, media.mime, 'opslag')) : null;
      const { error } = await supabase.from('moments').insert({
        author_id: me.id,
        page_id: side ?? null,
        post_id: post?.id ?? null,
        media_path,
        media_type: media?.video ? 'video' : 'image',
        text: text.trim(),
      });
      if (error) throw error;
      router.replace('/');
    } catch {
      setError('Momentet kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <Screen title={post ? 'Del som moment' : 'Nyt moment'} footer={<View style={s.footer}><Button title="Del moment" block disabled={!ok} loading={busy} onPress={share} /></View>}>
      {post ? (
        <View style={s.post}>
          <View style={s.postHead}>
            <Avatar name={post.author_name} path={post.author_avatar_path} size="S" />
            <T v="captionStrong">{post.author_name}</T>
          </View>
          {post.image_paths[0] && <Image source={imageSource(post.image_paths[0])} style={s.postImg} contentFit="cover" />}
          {!!post.text && (
            <T v="bodyS" numberOfLines={4}>
              {post.text}
            </T>
          )}
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={media ? 'Vælg et andet billede eller video' : 'Vælg billede eller video'} onPress={choose} style={s.pick}>
          {media && !media.video ? (
            <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Icon name={media?.video ? 'video' : 'image'} size={32} />
              <T v="label">{media?.video ? 'Video valgt' : 'Vælg billede eller video'}</T>
            </View>
          )}
        </Pressable>
      )}
      {media && (
        <View style={{ alignItems: 'center' }}>
          <Button title="Skift" variant="secondary" icon="image" onPress={choose} style={{ minHeight: 44 }} />
        </View>
      )}
      <TextField label="Tekst" placeholder="Skriv noget (valgfrit)" value={text} onChangeText={setText} maxLength={MAX} multiline />
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <T v="caption" c={color.textSecondary}>
        Forsvinder efter 24 timer.
      </T>
    </Screen>
  );
}

const s = StyleSheet.create({
  pick: {
    aspectRatio: 9 / 14,
    maxHeight: 420,
    alignSelf: 'center',
    width: '78%',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    backgroundColor: color.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  post: { borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface, padding: 14, gap: 8 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postImg: { width: '100%', aspectRatio: 1.4, borderRadius: radius.md },
  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
});
