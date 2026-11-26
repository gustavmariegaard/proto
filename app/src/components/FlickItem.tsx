import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { imageSource } from '@/lib/media';
import { hidePost, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { fmtCount } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { color, TAP } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { MenuItem } from './MenuItem';
import { Sheet } from './Sheet';
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
  onHidden: () => void;
};

/** Én flick i fuld skærm: video/billede, handlinger til højre, tekstboks nederst og ⋯ øverst til højre */
export const FlickItem = memo(function FlickItem({ flick, height, bottomInset, topInset, active, why, onComments, onHidden }: Props) {
  const me = useMe();
  const [liked, setLiked] = useState(flick.liked);
  const [likes, setLikes] = useState(flick.likes);
  const [saved, setSavedState] = useState(flick.saved);
  const [menu, setMenu] = useState<'closed' | 'menu' | 'why'>('closed');
  const mine = flick.author_id === me.id;
  const path = flick.image_paths[0];

  return (
    <View style={{ height, backgroundColor: '#000' }} accessibilityLabel={`Flick fra ${flick.author_name}: ${flick.text}`}>
      {path && flick.media_type === 'video' ? (
        <VideoView path={path} active={active} />
      ) : path ? (
        <Image source={imageSource(path)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : null}

      {/* Let skygge øverst og nederst, så hvid tekst kan læses på lyse billeder */}
      <Svg style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} width="100%" height="100%">
        <Defs>
          <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.45" />
            <Stop offset="0.16" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.7" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#top)" />
      </Svg>

      <Pressable accessibilityRole="button" accessibilityLabel="Flere muligheder" onPress={() => setMenu('menu')} style={[s.more, { top: topInset }]}>
        <Icon name="dots" color="#fff" />
      </Pressable>

      <View style={[s.bottom, { bottom: bottomInset }]}>
        <View style={s.actions}>
          <Action
            icon={liked ? 'heart-filled' : 'heart'}
            label="Synes godt om"
            count={likes}
            selected={liked}
            onPress={() => {
              setLiked(!liked);
              setLikes((n) => n + (liked ? -1 : 1));
              setLike(flick.id, me.id, !liked);
            }}
          />
          <Action icon="chat" label="Kommentarer" count={flick.comments} onPress={onComments} />
          {flick.allow_share && <Action icon="send" label="Del" onPress={() => router.push(`/opslag/${flick.id}/del`)} />}
          <Action
            icon="bookmark"
            label="Gem"
            selected={saved}
            filled={saved}
            onPress={() => {
              setSavedState(!saved);
              setSaved(flick.id, me.id, !saved);
            }}
          />
        </View>

        <View style={s.caption}>
          <Pressable accessibilityRole="link" onPress={() => router.push(mine ? '/profil' : `/bruger/${flick.author_username}`)} style={{ alignSelf: 'flex-start' }}>
            <T v="headingS" c="#fff">
              @{flick.author_username}
            </T>
          </Pressable>
          {!!flick.text && (
            <T v="bodyS" c="#f2f2f2" numberOfLines={3}>
              {flick.text}
            </T>
          )}
          {flick.tags.length > 0 && (
            <T v="captionStrong" c="rgba(255,255,255,0.8)">
              {flick.tags.map((t) => `#${t}`).join('  ')}
            </T>
          )}
        </View>
      </View>

      <Sheet open={menu !== 'closed'} onClose={() => setMenu('closed')} title={menu === 'why' ? 'Hvorfor ser jeg denne flick?' : 'Flick'}>
        {menu === 'why' ? (
          <View style={{ padding: 20, gap: 12 }}>
            <T v="body">{why}</T>
            <T v="caption" c={color.textSecondary}>
              ciircle viser kun flicks fra dem, du følger, og de interesser, du selv har valgt.
            </T>
          </View>
        ) : (
          <View>
            <MenuItem icon="info" label="Hvorfor ser jeg denne flick?" onPress={() => setMenu('why')} />
            {!mine && (
              <MenuItem
                icon="eye-off"
                label="Ikke interesseret"
                onPress={() => {
                  setMenu('closed');
                  hidePost(flick.id, me.id);
                  onHidden();
                }}
              />
            )}
            {!mine && (
              <MenuItem
                icon="flag"
                label="Rapportér"
                danger
                onPress={() => {
                  setMenu('closed');
                  router.push(`/opslag/${flick.id}/rapporter`);
                }}
              />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
});

function Action({ icon, label, count, selected, filled, onPress }: { icon: IconName; label: string; count?: number; selected?: boolean; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}: ${count}` : label}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [s.act, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={28} color="#fff" filled={filled} />
      {count !== undefined && count > 0 && (
        <T v="captionStrong" c="#fff">
          {fmtCount(count)}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  more: { position: 'absolute', zIndex: 11, right: 8, width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 16, right: 16, gap: 16 },
  actions: { alignSelf: 'flex-end', gap: 10, marginRight: -12 },
  act: { minWidth: 48, minHeight: TAP, alignItems: 'center', gap: 2 },
  caption: { gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 26, backgroundColor: 'rgba(10,10,10,0.85)' },
});
