import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { imageSource } from '@/lib/media';
import { deletePost, hidePost, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { fmtCount } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { font, radius, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { PostMenu } from './PostMenu';
import { T } from './T';
import { VideoView } from './VideoView';

type Props = {
  flick: PostCard;
  height: number;
  /** Afstand fra bunden til over bundmenuen */
  bottomInset: number;
  topInset: number;
  active: boolean;
  /** Hvorfor-teksten ("Flicken handler om …") */
  why: string;
  onComments: () => void;
  /** Flicken er slettet og skal fjernes fra feedet */
  onRemoved: () => void;
};

/** Én flick i fuld skærm (prototypens FlickView): billede/video, handlinger til højre, tekstpanel nederst og ⋯ øverst til højre */
export const FlickItem = memo(function FlickItem({ flick, height, bottomInset, topInset, active, why, onComments, onRemoved }: Props) {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(flick.liked);
  const [likes, setLikes] = useState(flick.likes);
  const [saved, setSavedState] = useState(flick.saved);
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const mine = flick.author_id === me.id;
  const path = flick.image_paths[0];

  return (
    <View style={{ height, backgroundColor: '#000', overflow: 'hidden' }} accessibilityLabel={`${flick.author_name}: ${flick.text}`}>
      {path && flick.media_type === 'video' ? (
        <VideoView path={path} active={active && !hidden} />
      ) : path ? (
        <Image source={imageSource(path)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : null}

      {/* Let skygge øverst, så hvide faner og ⋯ kan læses på lyse billeder */}
      <Svg style={[s.shade, { height: insets.top + 110 }]} width="100%" height={insets.top + 110} pointerEvents="none">
        <Defs>
          <LinearGradient id={`shade-${flick.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.42" />
            <Stop offset="0.55" stopColor="#000" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#shade-${flick.id})`} />
      </Svg>

      {/* ⋯ øverst til højre, præcis som på opslag */}
      <Pressable accessibilityRole="button" accessibilityLabel="Flere muligheder" onPress={() => setMenu(true)} style={[s.more, { top: topInset }]}>
        <Icon name="dots" color="#fff" />
      </Pressable>
      <PostMenu
        noun="flick"
        open={menu}
        onClose={() => setMenu(false)}
        why={why}
        mine={mine}
        onHide={() => {
          setHidden(true);
          hidePost(flick.id, me.id, true);
        }}
        onReport={() => router.push(`/opslag/${flick.id}/rapporter`)}
        onDelete={async () => {
          await deletePost(flick.id);
          onRemoved();
        }}
      />

      {hidden && (
        <View style={s.hidden}>
          <T v="bodyS" c="#fff" style={{ textAlign: 'center' }}>
            <T v="bodyS" c="#fff" style={{ fontFamily: font.bodyBold }}>
              Flicken er skjult.
            </T>{' '}
            Du ser færre flicks som denne.
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setHidden(false);
              hidePost(flick.id, me.id, false);
            }}
            style={s.undo}
          >
            <T v="captionStrong" c="#fff">
              Fortryd
            </T>
          </Pressable>
        </View>
      )}

      <View style={[s.bottom, { bottom: bottomInset }]}>
        <View style={s.actions}>
          <Action
            icon={liked ? 'heart-filled' : 'heart'}
            label="Synes godt om"
            count={likes}
            pressed={liked}
            onPress={() => {
              setLiked(!liked);
              setLikes((n) => n + (liked ? -1 : 1));
              setLike(flick.id, me.id, !liked);
            }}
          />
          <Action icon="chat" label="Kommentarer" count={flick.comments} onPress={onComments} />
          {/* Samme deling som alle andre opslag: Besked, Opslag eller Moment */}
          {flick.allow_share && <Action icon="send" label="Delinger" onPress={() => router.push(`/opslag/${flick.id}/del`)} />}
          <Action
            icon="bookmark"
            label="Gem"
            pressed={saved}
            filled={saved}
            onPress={() => {
              setSavedState(!saved);
              setSaved(flick.id, me.id, !saved);
            }}
          />
        </View>

        <View style={s.caption}>
          <T
            v="headingS"
            c="#fff"
            accessibilityRole="link"
            onPress={() => router.push(mine ? '/profil' : `/bruger/${flick.author_username}`)}
          >
            @{flick.author_username}
          </T>
          {!!flick.text && (
            <T v="bodyS" c="#f5f5f4">
              {flick.text}
            </T>
          )}
          {flick.tags.length > 0 && (
            <T v="captionStrong" c="rgba(255,255,255,0.8)">
              {flick.tags.map((t) => `#${t}`).join(' ')}
            </T>
          )}
        </View>
      </View>
    </View>
  );
});

/** Ikon med antal under (antal vises ikke for Gem og Del) */
function Action({ icon, label, count, pressed, filled, onPress }: { icon: IconName; label: string; count?: number; pressed?: boolean; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}: ${count}` : label}
      accessibilityState={pressed !== undefined ? { selected: pressed } : undefined}
      onPress={onPress}
      style={({ pressed: p }) => [s.act, p && { opacity: 0.6 }]}
    >
      <View style={s.shadow}>
        <Icon name={icon} size={28} color="#fff" filled={filled} />
      </View>
      {count !== undefined && (
        <T v="captionStrong" c="#fff" style={s.textShadow}>
          {fmtCount(count)}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  shade: { position: 'absolute', top: 0, left: 0, right: 0 },
  more: { position: 'absolute', zIndex: 11, right: 10, width: TAP, height: TAP, borderRadius: TAP / 2, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 16, right: 16, gap: 16 },
  actions: { alignSelf: 'flex-end', gap: 10, marginRight: -12 },
  act: { minWidth: 48, minHeight: TAP, alignItems: 'center', gap: 2 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  textShadow: { textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  caption: { alignItems: 'flex-start', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 26, backgroundColor: 'rgba(10,10,10,0.85)' },
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: 'rgba(23,23,23,0.92)',
  },
  undo: { minHeight: TAP, paddingHorizontal: 18, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: radius.pill },
});
