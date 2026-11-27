import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { imageSource } from '@/lib/media';
import { deleteMoment, markSeen, setMomentLike, type MomentCard } from '@/lib/moments';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { useDarkChrome } from '@/lib/useDarkChrome';
import { color, font, radius, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { MenuItem } from './MenuItem';
import { Sheet } from './Sheet';
import { T } from './T';
import { VideoView } from './VideoView';

const IMAGE_MS = 5000;
const VIDEO_MS = 15000;

type Props = {
  moments: MomentCard[];
  /** Start ved første usete (moments-rækken) eller ved 0 (highlights) */
  startAtUnseen?: boolean;
  /** Overskrift i stedet for afsender (highlights) */
  title?: string;
  /** Efter sidste moment (fx videre til næste person) */
  onEnd: () => void;
  /** Før første moment */
  onBeforeStart?: () => void;
};

/**
 * Fuldskærmsvisning af moments (som prototypens MomentViewer):
 * streger øverst, tryk venstre/højre for forrige/næste, hold for pause,
 * svar som besked, hjerte og ⋯ (rapportér eller slet dit eget).
 */
export function MomentStory({ moments, startAtUnseen, title, onEnd, onBeforeStart }: Props) {
  useDarkChrome();
  const me = useMe();
  const first = startAtUnseen ? Math.max(0, moments.findIndex((m) => !m.seen && m.author_id !== me.id)) : 0;
  const [index, setIndex] = useState(first === -1 ? 0 : first);
  const [liked, setLiked] = useState<Record<string, boolean>>(() => Object.fromEntries(moments.map((m) => [m.id, m.liked])));
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  const [menu, setMenu] = useState(false);
  const [post, setPost] = useState<PostCard | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const current = moments[index];
  const mine = current?.author_id === me.id && !current?.page_id;
  const isPage = !!current?.page_id;
  const typing = reply.length > 0;
  const hold = paused || menu || typing;

  const next = useCallback(() => {
    if (index < moments.length - 1) setIndex(index + 1);
    else onEnd();
  }, [index, moments.length, onEnd]);
  const prev = () => {
    if (index > 0) setIndex(index - 1);
    else if (onBeforeStart) onBeforeStart();
    else progress.setValue(0);
  };

  // Ny visning: nulstil og marker som set
  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    setSent(false);
    if (!current.seen && current.author_id !== me.id) markSeen(current.id, me.id);
    setPost(null);
    if (current.post_id) getPost(current.post_id).then(setPost);
  }, [current, me.id, progress]);

  // Fremdrift: kører, medmindre man holder fingeren, skriver eller har menuen åben
  useEffect(() => {
    if (!current || hold) {
      anim.current?.stop();
      return;
    }
    const ms = current.media_type === 'video' ? VIDEO_MS : IMAGE_MS;
    const left = 1 - (progress as any)._value;
    anim.current = Animated.timing(progress, { toValue: 1, duration: ms * left, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => finished && next());
    return () => anim.current?.stop();
  }, [current, hold, next, progress]);

  if (!current) return null;

  const who = isPage ? current.page_name ?? '' : current.author_name;
  const whoPath = isPage ? current.page_avatar_path : current.author_avatar_path;
  const openProfile = () => router.push(isPage ? `/sider/${current.page_handle}` : mine ? '/profil' : `/bruger/${current.author_username}`);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text) return;
    setReply('');
    const { data: conv } = await supabase.rpc('start_conversation', { member_ids: [current.author_id] });
    if (conv) {
      await supabase.from('messages').insert({ conversation_id: conv, sender_id: me.id, body: `Svar på dit moment: ${text}` });
      setSent(true);
    }
  };

  const toggleLike = () => {
    const on = !liked[current.id];
    setLiked((l) => ({ ...l, [current.id]: on }));
    setMomentLike(current.id, me.id, on);
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {/* Billede eller video */}
      {current.media_path ? (
        current.media_type === 'video' ? (
          <VideoView key={current.id} path={current.media_path} active={!hold} contentFit="contain" />
        ) : (
          <Image source={imageSource(current.media_path)} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
        )
      ) : (
        <View style={[StyleSheet.absoluteFill, s.textOnly]} />
      )}

      {/* Tryk venstre/højre, hold for pause */}
      <View style={[StyleSheet.absoluteFill, s.taps]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forrige"
          style={{ flex: 1 }}
          onPress={prev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={200}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Næste"
          style={{ flex: 2 }}
          onPress={next}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={200}
        />
      </View>

      <SafeAreaView style={[s.overlay, { pointerEvents: 'box-none' }]} edges={['top', 'bottom']}>
        {/* Streger og afsender */}
        <View style={[s.bars, { pointerEvents: 'none' }]}>
          {moments.map((m, i) => (
            <View key={m.id} style={s.bar}>
              {i < index && <View style={[s.fill, { width: '100%' }]} />}
              {i === index && <Animated.View style={[s.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />}
            </View>
          ))}
        </View>
        <View style={s.head}>
          <Pressable accessibilityRole="link" onPress={openProfile} style={s.who}>
            <Avatar name={who} path={whoPath} size={24} />
            <T v="label" c={color.white} numberOfLines={1} style={{ flexShrink: 1 }}>
              {title ?? (isPage ? who : `@${current.author_username}`)}
            </T>
            <T v="caption" c="rgba(255,255,255,0.7)">
              {ago(current.created_at)}
            </T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Flere muligheder" onPress={() => setMenu(true)} style={s.headBtn}>
            <Icon name="dots" color={color.white} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Luk" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.headBtn}>
            <Icon name="close" color={color.white} />
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', padding: 24, pointerEvents: 'box-none' }}>
          {/* Delt opslag */}
          {post && (
            <Pressable accessibilityRole="link" onPress={() => router.push(`/opslag/${post.id}`)} style={s.post}>
              <View style={s.postHead}>
                <Avatar name={post.author_name} path={post.author_avatar_path} size={24} />
                <T v="captionStrong">{post.author_name}</T>
              </View>
              {post.image_paths[0] && <Image source={imageSource(post.image_paths[0])} style={s.postImg} contentFit="cover" />}
              {!!post.text && (
                <T v="bodyS" numberOfLines={5}>
                  {post.text}
                </T>
              )}
            </Pressable>
          )}
        </View>

        {!!current.text && (
          <View style={[s.caption, { pointerEvents: 'none' }]}>
            <T v="body" c={color.white} style={!current.media_path && !post ? s.bigText : undefined}>
              {current.text}
            </T>
          </View>
        )}

        {/* Svar og hjerte */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.foot}>
            {mine ? (
              <T v="captionStrong" c="rgba(255,255,255,0.8)" style={{ flex: 1 }}>
                {current.views ? `Set af ${current.views}` : 'Ingen har set det endnu'}
              </T>
            ) : isPage ? (
              <View style={{ flex: 1 }} />
            ) : (
              <TextInput
                value={reply}
                onChangeText={setReply}
                onSubmitEditing={sendReply}
                placeholder={sent ? 'Sendt' : `Svar ${current.author_name.split(' ')[0]}`}
                placeholderTextColor="rgba(255,255,255,0.7)"
                accessibilityLabel={`Svar ${current.author_name.split(' ')[0]}`}
                returnKeyType="send"
                style={[s.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
              />
            )}
            {!mine && (
              <Pressable accessibilityRole="button" accessibilityLabel="Synes godt om" accessibilityState={{ selected: !!liked[current.id] }} onPress={toggleLike} style={s.round}>
                <Icon name={liked[current.id] ? 'heart-filled' : 'heart'} color={liked[current.id] ? color.accent : color.white} />
              </Pressable>
            )}
            {typing && (
              <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={sendReply} style={s.round}>
                <Icon name="send" color={color.white} />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Moment">
        {mine ? (
          <MenuItem
            icon="close"
            label="Slet moment"
            danger
            onPress={async () => {
              setMenu(false);
              await deleteMoment(current.id);
              next();
            }}
          />
        ) : (
          <MenuItem
            icon="flag"
            label="Rapportér"
            danger
            onPress={async () => {
              setMenu(false);
              await supabase.from('reports').insert({ reporter_id: me.id, profile_id: current.author_id, reason: 'andet', details: `Moment ${current.id}` });
              next();
            }}
          />
        )}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  textOnly: { backgroundColor: '#0f2a22' },
  taps: { flexDirection: 'row' },
  overlay: { flex: 1 },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 8 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.white },
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, paddingTop: 6 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TAP },
  headBtn: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  post: { backgroundColor: color.bgSurface, borderRadius: radius.xl, padding: 14, gap: 8 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postImg: { width: '100%', aspectRatio: 1.4, borderRadius: radius.md },
  caption: { paddingHorizontal: 20, paddingBottom: 12 },
  bigText: { fontFamily: font.title, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  input: {
    flex: 1,
    minHeight: TAP + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 18,
    color: color.white,
    fontFamily: font.body,
    fontSize: 16,
  },
  round: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
});
