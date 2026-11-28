import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Avatar } from '@/components/Avatar';
import { CommentsSheet } from '@/components/CommentsSheet';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { MentionText } from '@/components/MentionText';
import { T } from '@/components/T';
import { VideoView } from '@/components/VideoView';
import { imageSource } from '@/lib/media';
import { getPost, normalize, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { fmtCount } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { useBlackChrome } from '@/lib/useDarkChrome';
import { TAP } from '@/theme/tokens';

/**
 * Billede eller video fra et opslag i fuld skærm (åbnes ved tryk på mediet i feedet).
 * - Toner blødt frem på sort baggrund, billedet vises helt (ikke beskåret)
 * - Flere billeder: stryg til siden, prikker viser hvor man er
 * - Træk ned for at lukke, tryk på billedet for at skjule/vise knapperne
 * - Samme handlinger som på opslaget nederst: hjerte, kommentarer, del og gem
 */
export default function MediaViewer() {
  useBlackChrome();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [post, setPost] = useState<PostCard | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSavedState] = useState(false);
  const [comments, setComments] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [page, setPage] = useState(0);
  const [chrome, setChrome] = useState(true);

  const fade = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const chromeA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getPost(id).then((p) => {
      if (!p) return;
      const n = normalize(p);
      setPost(n);
      setLiked(n.liked);
      setLikes(n.likes);
      setSavedState(n.saved);
      setComments(n.comments);
    });
  }, [id]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [fade]);

  useEffect(() => {
    Animated.timing(chromeA, { toValue: chrome ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [chrome, chromeA]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const close = () => Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: false }).start(leave);

  // Træk ned for at lukke (kun lodrette træk, så man stadig kan stryge mellem billeder)
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4,
        onPanResponderMove: (_e, g) => dragY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 120 || g.vy > 0.9) {
            Animated.parallel([
              Animated.timing(dragY, { toValue: height, duration: 180, useNativeDriver: false }),
              Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: false }),
            ]).start(leave);
          } else {
            Animated.spring(dragY, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height],
  );

  const paths = post?.image_paths ?? [];
  const video = post?.media_type === 'video';
  const name = post ? (post.page_name ?? post.author_name) : '';
  const bgOpacity = Animated.multiply(fade, dragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.35], extrapolate: 'clamp' }));
  const scale = dragY.interpolate({ inputRange: [0, 400], outputRange: [1, 0.86], extrapolate: 'clamp' });

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, s.black, { opacity: bgOpacity }]} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ translateY: dragY }, { scale }] }]} {...pan.panHandlers}>
        {video && paths[0] ? (
          <VideoView path={paths[0]} active contentFit="contain" />
        ) : paths.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))}
            style={StyleSheet.absoluteFill}
          >
            {paths.map((p, i) => (
              <Pressable key={p} accessibilityRole="button" accessibilityLabel={chrome ? 'Skjul knapperne' : 'Vis knapperne'} onPress={() => setChrome((c) => !c)} style={{ width, height }}>
                <Image
                  source={imageSource(p)}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  transition={200}
                  accessibilityLabel={paths.length > 1 ? `Billede ${i + 1} af ${paths.length}` : 'Billedet i opslaget'}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </Animated.View>

      {/* Toppen: luk og evt. hvilket billede man er på */}
      <Animated.View style={[s.top, { paddingTop: insets.top + 8, opacity: Animated.multiply(fade, chromeA) }]} pointerEvents={chrome ? 'box-none' : 'none'}>
        <Fade top />
        <Glass tint="dark" style={s.round}>
          <Pressable accessibilityRole="button" accessibilityLabel="Luk" onPress={close} style={s.roundBtn} hitSlop={6}>
            <Icon name="close" color="#fff" size={22} />
          </Pressable>
        </Glass>
        {paths.length > 1 && !video && (
          <Glass tint="dark" style={s.counter}>
            <T v="captionStrong" c="#fff" style={{ fontVariant: ['tabular-nums'] }}>
              {page + 1} / {paths.length}
            </T>
          </Glass>
        )}
      </Animated.View>

      {post && (
        <Animated.View style={[s.bottom, { paddingBottom: insets.bottom + 12, opacity: Animated.multiply(fade, chromeA) }]} pointerEvents={chrome ? 'box-none' : 'none'}>
          <Fade />
          {paths.length > 1 && !video && (
            <View style={s.dots} accessible={false}>
              {paths.map((p, i) => (
                <View key={p} style={[s.dot, i === page && s.dotOn]} />
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(post.page_id ? `/sider/${post.page_handle}` : `/bruger/${post.author_username}`)}
            style={s.who}
          >
            <Avatar name={name} path={post.page_id ? post.page_avatar_path : post.author_avatar_path} size={32} />
            <View style={{ flexShrink: 1 }}>
              <T v="headingS" c="#fff" numberOfLines={1} style={s.shadow}>
                {name}
              </T>
              <T v="caption" c="rgba(255,255,255,0.75)" numberOfLines={1} style={s.shadow}>
                @{post.page_handle ?? post.author_username}
              </T>
            </View>
          </Pressable>
          {!!post.text && (
            <MentionText v="bodyS" c="rgba(255,255,255,0.92)" linkColor="#fff" numberOfLines={3} style={s.shadow}>
              {post.text}
            </MentionText>
          )}
          <View style={s.actions}>
            {post.kind !== 'debat' && (
              <Act
                icon={liked ? 'heart-filled' : 'heart'}
                label="Synes godt om"
                count={likes}
                filled={liked}
                onPress={() => {
                  setLiked(!liked);
                  setLikes((n) => n + (liked ? -1 : 1));
                  setLike(post.id, me.id, !liked);
                }}
              />
            )}
            <Act icon="chat" label="Kommentarer" count={comments} onPress={() => setShowComments(true)} />
            <Act icon="send" label="Del" onPress={() => router.push(`/opslag/${post.id}/del`)} />
            <View style={{ flex: 1 }} />
            <Act
              icon="bookmark"
              label="Gem"
              filled={saved}
              onPress={() => {
                setSavedState(!saved);
                setSaved(post.id, me.id, !saved);
              }}
            />
          </View>
        </Animated.View>
      )}
      {post && (
        <CommentsSheet postId={post.id} postAuthorId={post.author_id} open={showComments} onClose={() => setShowComments(false)} onCount={setComments} />
      )}
    </View>
  );
}

/** Blød mørk toning bag tekst og knapper (i stedet for en hård sort bjælke) */
function Fade({ top }: { top?: boolean }) {
  const gid = top ? 'mvTop' : 'mvBottom';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gid} x1="0" y1={top ? '0' : '1'} x2="0" y2={top ? '1' : '0'}>
            <Stop offset="0" stopColor="#000" stopOpacity={top ? 0.45 : 0.7} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}

function Act({ icon, label, count, filled, onPress }: { icon: IconName; label: string; count?: number; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}: ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [s.act, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Icon name={icon} size={26} color="#fff" filled={filled} />
      {!!count && (
        <T v="captionStrong" c="#fff" style={s.shadow}>
          {fmtCount(count)}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  black: { backgroundColor: '#000' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 24 },
  round: { borderRadius: TAP / 2 },
  roundBtn: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  counter: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 56, gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { backgroundColor: '#fff', width: 16 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', minHeight: TAP },
  shadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 2 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, minWidth: TAP },
});
