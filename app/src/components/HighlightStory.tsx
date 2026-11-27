import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { imageSource } from '@/lib/media';
import type { MomentCard } from '@/lib/moments';
import { color, font } from '@/theme/tokens';
import { Icon } from './Icon';
import { T } from './T';
import { VideoView } from './VideoView';

const IMAGE_MS = 5000;
const VIDEO_MS = 15000;

type Props = {
  items: MomentCard[];
  title: string;
  startAt?: number;
  onClose: () => void;
  /** Knapper nederst, fx "Se alle" */
  actions?: ReactNode;
};

/**
 * Afspiller en highlight som en story (prototypens StoryViewer): billedet fylder skærmen,
 * titel og antal øverst til venstre, luk til højre, fremdrift i bunden.
 * Tryk til højre for næste, til venstre for forrige. Hold fingeren nede for at pause.
 */
export function HighlightStory({ items, title, startAt = 0, onClose, actions }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(Math.min(Math.max(startAt, 0), Math.max(items.length - 1, 0)));
  const [held, setHeld] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const current = items[index];
  const video = current?.media_type === 'video' && !!current.media_path;

  const goTo = useCallback(
    (i: number) => {
      if (i >= items.length) return onClose();
      progress.setValue(0);
      setIndex(Math.max(0, i));
    },
    [items.length, onClose, progress],
  );

  // Fremdrift: står stille, mens man holder fingeren nede, og fortsætter, hvor den slap
  useEffect(() => {
    if (!current || held) {
      anim.current?.stop();
      return;
    }
    const left = 1 - (progress as any)._value;
    anim.current = Animated.timing(progress, { toValue: 1, duration: (video ? VIDEO_MS : IMAGE_MS) * left, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => finished && goTo(index + 1));
    return () => anim.current?.stop();
  }, [current, held, index, video, goTo, progress]);

  if (!current) return null;

  const videos = items.filter((m) => m.media_type === 'video' && m.media_path).length;
  const pics = items.length - videos;
  const count = [pics && `${pics} ${pics === 1 ? 'billede' : 'billeder'}`, videos && `${videos} ${videos === 1 ? 'video' : 'videoer'}`].filter(Boolean).join(' · ');

  const holdProps = {
    onLongPress: () => setHeld(true),
    onPressOut: () => setHeld(false),
    delayLongPress: 220,
  };

  return (
    <View style={s.root} accessibilityLabel={`Samlingen ${title}`}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill}>
        {current.media_path ? (
          video ? (
            <VideoView key={current.id} path={current.media_path} active={!held} />
          ) : (
            <Image source={imageSource(current.media_path)} style={[StyleSheet.absoluteFill, held && { opacity: 0.9 }]} contentFit="cover" transition={150} />
          )
        ) : (
          <View style={[StyleSheet.absoluteFill, s.textOnly]}>
            <T style={s.bigText} c={color.white}>
              {current.text}
            </T>
          </View>
        )}
        {/* Mørk toning øverst og nederst, så tekst og knapper kan læses */}
        <Svg style={[s.shadeTop, { height: insets.top + 140, pointerEvents: 'none' }]} width="100%" height={insets.top + 140}>
          <Defs>
            <LinearGradient id="hlTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hlTop)" />
        </Svg>
        <Svg style={[s.shadeBottom, { pointerEvents: 'none' }]} width="100%" height={200}>
          <Defs>
            <LinearGradient id="hlBottom" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#000" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hlBottom)" />
        </Svg>
        <Pressable accessibilityRole="button" accessibilityLabel="Forrige" style={[s.tap, s.prev]} onPress={() => goTo(index - 1)} {...holdProps} />
        <Pressable accessibilityRole="button" accessibilityLabel="Næste" style={[s.tap, s.next]} onPress={() => goTo(index + 1)} {...holdProps} />
      </View>

      {/* Fremdrift som stories, men i bunden af skærmen */}
      <View style={[s.progress, { bottom: Math.max(10, insets.bottom - 10), pointerEvents: 'none' }]} accessibilityLabel={`${index + 1} af ${items.length}`}>
        {items.map((m, i) => (
          <View key={m.id} style={s.seg}>
            {i < index && <View style={[s.fill, { width: '100%' }]} />}
            {i === index && <Animated.View style={[s.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />}
          </View>
        ))}
      </View>

      <View style={[s.top, { marginTop: insets.top + 10, pointerEvents: 'box-none' }]}>
        <View style={[s.title, { pointerEvents: 'none' }]}>
          <T v="headingS" c={color.white} numberOfLines={1} style={s.shadow}>
            {title}
          </T>
          <T v="caption" c="rgba(255,255,255,0.85)" style={s.shadow}>
            {count}
            {video ? ' · Video' : ''}
          </T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Luk" onPress={onClose} style={s.close}>
          <Icon name="close" color={color.white} />
        </Pressable>
      </View>

      {actions && <View style={[s.actions, { bottom: 52 + insets.bottom, pointerEvents: 'box-none' }]}>{actions}</View>}
    </View>
  );
}

/** Knap i bunden af viseren (prototypens .pf-viewer__action) */
export function StoryAction({ icon, label, onPress }: { icon: 'layout-grid'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.action, pressed && { opacity: 0.85 }]}>
      <Icon name={icon} size={20} color={color.white} />
      <T c={color.white} style={s.actionTxt}>
        {label}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink700, overflow: 'hidden' },
  textOnly: { backgroundColor: '#0f2a22', alignItems: 'center', justifyContent: 'center', padding: 24 },
  bigText: { fontFamily: font.title, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  shadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  tap: { position: 'absolute', top: 0, bottom: 0 },
  prev: { left: 0, width: '35%' },
  next: { right: 0, width: '65%' },
  progress: { position: 'absolute', left: 14, right: 14, height: 3, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.35)' },
  fill: { height: '100%', backgroundColor: color.white, borderRadius: 2 },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 14 },
  title: { flexShrink: 1, minWidth: 0 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  actionTxt: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
});
