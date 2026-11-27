import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, PanResponder, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { imageSource } from '@/lib/media';
import { deleteMoment, markSeen, setMomentLike, type MomentCard } from '@/lib/moments';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { useBlackChrome } from '@/lib/useDarkChrome';
import { color, font, radius, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { MenuItem } from './MenuItem';
import { Sheet } from './Sheet';
import { T } from './T';
import { VideoView } from './VideoView';

const IMAGE_MS = 5000; // 5 sekunder pr. moment
const VIDEO_MS = 15000;
const shadow = { textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 };

type Props = {
  moments: MomentCard[];
  /** Start ved første usete */
  startAtUnseen?: boolean;
  /** Efter sidste moment (fx videre til næste person) */
  onEnd: () => void;
  /** Før første moment */
  onBeforeStart?: () => void;
  /** Luk (kryds eller træk nedad) */
  onClose?: () => void;
};

/**
 * Moment i fuld skærm (prototypens MomentViewer). Billedet fylder hele skærmen.
 * Tryk til højre for næste, til venstre for forrige, hold nede = pause, træk nedad = luk.
 * Fremdriften er tynde streger nederst. Nederst: svar, hjerte og del.
 */
export function MomentStory({ moments, startAtUnseen, onEnd, onBeforeStart, onClose }: Props) {
  useBlackChrome();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const first = startAtUnseen ? moments.findIndex((m) => !m.seen && m.author_id !== me.id) : 0;
  const [index, setIndex] = useState(first === -1 ? 0 : first);
  const [liked, setLiked] = useState<Record<string, boolean>>(() => Object.fromEntries(moments.map((m) => [m.id, m.liked])));
  const [held, setHeld] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  const [menu, setMenu] = useState(false);
  const [post, setPost] = useState<PostCard | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const current = moments[index];
  const mine = current?.author_id === me.id && !current?.page_id;
  const isPage = !!current?.page_id;
  const paused = held || typing || menu;

  const close = useCallback(() => (onClose ? onClose() : router.canGoBack() ? router.back() : router.replace('/')), [onClose]);

  const next = useCallback(() => {
    if (index < moments.length - 1) setIndex(index + 1);
    else onEnd();
  }, [index, moments.length, onEnd]);
  const prev = () => {
    if (index > 0) setIndex(index - 1);
    else if (onBeforeStart) onBeforeStart();
    else progress.setValue(0);
  };

  // Nyt moment: nulstil og marker som set
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
    if (!current || paused) {
      anim.current?.stop();
      return;
    }
    const ms = current.media_type === 'video' ? VIDEO_MS : IMAGE_MS;
    const left = 1 - (progress as any)._value;
    anim.current = Animated.timing(progress, { toValue: 1, duration: ms * left, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => finished && next());
    return () => anim.current?.stop();
  }, [current, paused, next, progress]);

  // Træk nedad for at lukke: momentet følger fingeren og glider tilbage, hvis man slipper tidligt
  const drag = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => g.dy > 8 && g.dy > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => setHeld(true),
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        setHeld(false);
        if (g.dy > 110) closeRef.current();
        else Animated.timing(drag, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        setHeld(false);
        Animated.timing(drag, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      },
    }),
  ).current;
  const closeRef = useRef(close);
  closeRef.current = close;

  if (!current) return null;

  const who = isPage ? (current.page_name ?? '') : current.author_name;
  const handle = isPage ? (current.page_handle ?? '') : current.author_username;
  const whoPath = isPage ? current.page_avatar_path : current.author_avatar_path;
  const firstName = who.split(' ')[0];
  const openProfile = () => router.push(isPage ? `/sider/${current.page_handle}` : mine ? '/profil' : `/bruger/${current.author_username}`);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text) return;
    setReply('');
    input.current?.blur();
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

  // Del: et delt opslag deles videre som opslag. Er der skrevet et svar, sendes det.
  const share = () => {
    if (reply.trim()) return sendReply();
    if (current.post_id) return router.push(`/opslag/${current.post_id}/del`);
    input.current?.focus();
  };

  const scale = drag.interpolate({ inputRange: [0, 400], outputRange: [1, 0.8], extrapolate: 'clamp' });

  return (
    <Animated.View
      style={[s.root, { paddingBottom: Math.max(28, insets.bottom + 14), transform: [{ translateY: drag }, { scale }] }]}
      accessibilityLabel={`Moment fra ${who}`}
      {...pan.panHandlers}
    >
      <StatusBar style="light" />
      {/* Billedet fylder hele skærmen */}
      <View style={[StyleSheet.absoluteFill, s.photo]}>
        {current.media_path ? (
          current.media_type === 'video' ? (
            <VideoView key={current.id} path={current.media_path} active={!paused} contentFit="cover" />
          ) : (
            <Image source={imageSource(current.media_path)} style={[StyleSheet.absoluteFill, held && { opacity: 0.9 }]} contentFit="cover" transition={150} />
          )
        ) : post && post.image_paths[0] && post.media_type !== 'video' ? (
          // Delt opslag: opslagets billede sløret bagved (som "Del som moment")
          <>
            <Image source={imageSource(post.image_paths[0])} style={s.blur} contentFit="cover" blurRadius={28} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          </>
        ) : null}
        {/* Delt opslag eller kun tekst: midt på skærmen */}
        {(post || (!current.media_path && !!current.text)) && (
          <View style={s.center} pointerEvents="none">
            {post ? (
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
                {!!post.image_paths[0] && post.media_type !== 'video' && <Image source={imageSource(post.image_paths[0])} style={s.quoteImg} contentFit="cover" />}
              </View>
            ) : (
              <T v="titleXl" c={color.white} style={[s.bigText, shadow]}>
                {current.text}
              </T>
            )}
          </View>
        )}
        {/* Mørk toning øverst og nederst, så tekst og knapper kan læses */}
        <Shade top height={insets.top + 140} />
        <Shade height={200} />
        {/* Tryk til siden skifter, hold nede = pause */}
        <View style={[StyleSheet.absoluteFill, s.taps]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forrige"
            style={{ width: '35%' }}
            onPress={prev}
            onLongPress={() => setHeld(true)}
            onPressOut={() => setHeld(false)}
            delayLongPress={180}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Næste"
            style={{ width: '65%' }}
            onPress={next}
            onLongPress={() => setHeld(true)}
            onPressOut={() => setHeld(false)}
            delayLongPress={180}
          />
        </View>
      </View>

      {/* Fremdrift som stories, men i bunden af skærmen: ét segment pr. moment */}
      <View style={[s.progress, { bottom: Math.max(10, insets.bottom - 10) }]} pointerEvents="none" accessibilityLabel={`${index + 1} af ${moments.length}`}>
        {moments.map((m, i) => (
          <View key={m.id} style={s.seg}>
            {i < index && <View style={[s.fill, { width: '100%' }]} />}
            {i === index && <Animated.View style={[s.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />}
          </View>
        ))}
      </View>

      <View style={[s.top, { marginTop: insets.top + 10 }]} pointerEvents="box-none">
        {/* Brugernavnet øverst til venstre */}
        <View style={s.who}>
          <Avatar name={who} path={whoPath} size="S" />
          <Pressable accessibilityRole="link" onPress={openProfile} style={s.link}>
            <T v="headingS" c={color.white} numberOfLines={1} style={shadow}>
              @{handle}
            </T>
          </Pressable>
          <T v="caption" c={color.white} style={[shadow, { opacity: 0.7 }]}>
            {ago(current.created_at)}
          </T>
        </View>
        {mine && <IconButton icon="dots" label="Flere muligheder" tint={color.white} onPress={() => setMenu(true)} />}
        <IconButton icon="close" label="Luk" tint={color.white} onPress={close} />
      </View>

      <View style={{ flex: 1 }} pointerEvents="none" />

      {!post && !!current.text && !!current.media_path && (
        <View style={s.caption} pointerEvents="none">
          <T v="bodyS" c={color.white} style={shadow}>
            {current.text}
          </T>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.reply}>
          {mine ? (
            <T v="captionStrong" c={color.white} style={[s.views, shadow]}>
              {current.views ? `Set af ${current.views}` : 'Ingen har set det endnu'}
            </T>
          ) : isPage ? (
            <View style={{ flex: 1 }} />
          ) : (
            <TextInput
              ref={input}
              value={reply}
              onChangeText={setReply}
              onSubmitEditing={sendReply}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              placeholder={sent ? 'Sendt' : `Svar ${firstName}`}
              placeholderTextColor={color.white}
              accessibilityLabel={`Svar ${firstName}`}
              returnKeyType="send"
              style={[s.field, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), typing && { borderColor: color.white }]}
            />
          )}
          {!mine && (
            <Pressable accessibilityRole="button" accessibilityLabel="Synes godt om" accessibilityState={{ selected: !!liked[current.id] }} onPress={toggleLike} style={s.like}>
              <Icon name={liked[current.id] ? 'heart-filled' : 'heart'} color={color.white} />
            </Pressable>
          )}
          {/* Del eller send momentet videre */}
          <Pressable accessibilityRole="button" accessibilityLabel="Del" onPress={share} style={s.like}>
            <View style={{ transform: [{ translateX: -3 }] }}>
              <Icon name="send" color={color.white} />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Kun dit eget moment: slet */}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Moment">
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
      </Sheet>
    </Animated.View>
  );
}

/** Mørk toning (gradient) øverst eller nederst */
function Shade({ top, height }: { top?: boolean; height: number }) {
  const id = top ? 'shadeTop' : 'shadeBottom';
  return (
    <View style={[s.shade, top ? { top: 0 } : { bottom: 0 }, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1={top ? '0' : '1'} x2="0" y2={top ? '1' : '0'}>
            <Stop offset="0" stopColor="#000" stopOpacity={top ? 0.55 : 0.6} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: color.ink900 },
  photo: { backgroundColor: '#3a3a3a' },
  blur: { position: 'absolute', top: -40, left: -40, right: -40, bottom: -40 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  quote: { width: '100%', maxWidth: 360, gap: 6, padding: 12, borderRadius: radius.lg, backgroundColor: color.bgSurface },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quoteImg: { width: '100%', height: 260, borderRadius: radius.md },
  bigText: { fontSize: 28, lineHeight: 34, textAlign: 'center', fontFamily: font.title },
  shade: { position: 'absolute', left: 0, right: 0 },
  taps: { flexDirection: 'row', zIndex: 2 },
  progress: { position: 'absolute', zIndex: 4, left: 14, right: 14, height: 3, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', boxShadow: '0 0 3px rgba(0,0,0,0.35)' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: color.white },
  top: { zIndex: 3, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 14 },
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  link: { minHeight: TAP, justifyContent: 'center', flexShrink: 1 },
  caption: { zIndex: 3, paddingHorizontal: 16, paddingBottom: 12 },
  reply: { zIndex: 3, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 4 },
  field: {
    flex: 1,
    minWidth: 0,
    height: 48,
    marginRight: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: color.white,
    fontFamily: font.body,
    fontSize: 16,
  },
  views: { flex: 1, marginRight: 10 },
  like: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
