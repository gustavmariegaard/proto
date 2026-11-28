import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { imageSource } from '@/lib/media';
import { TAP } from '@/theme/tokens';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { T } from './T';
import { VideoView } from './VideoView';

type Props = {
  /** Stierne i media-mappen */
  paths: string[];
  /** Én video i stedet for billeder */
  video?: boolean;
  /** Start på dette billede */
  startAt?: number;
  /** Kaldes, når visningen er lukket (efter animationen) */
  onClose: () => void;
  /** Beskrivelse til skærmlæsere, fx "Billede 2 af 4" sættes automatisk */
  label?: string;
  /** Indhold nederst (fx navn, tekst og knapper). Får det aktuelle billede. */
  footer?: (page: number) => ReactNode;
  /** Ekstra lag, der skal ligge over visningen (fx et kommentarark) */
  children?: ReactNode;
};

/**
 * Billeder eller en video i fuld skærm:
 * - Toner blødt frem på sort baggrund, billedet vises helt (ikke beskåret)
 * - Flere billeder: stryg til siden, tæller øverst og prikker nederst
 * - Træk ned for at lukke, tryk på billedet for at skjule/vise knapperne
 * Bruges af opslag (medie/[id]) og Torvet.
 */
export function MediaViewer({ paths, video = false, startAt = 0, onClose, label = 'Billede', footer, children }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(Math.max(0, Math.min(startAt, paths.length - 1)));
  const [chrome, setChrome] = useState(true);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const chromeA = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [fade]);

  useEffect(() => {
    Animated.timing(chromeA, { toValue: chrome ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [chrome, chromeA]);

  // Start på det billede, man trykkede på
  useEffect(() => {
    if (startAt > 0 && width) requestAnimationFrame(() => scroller.current?.scrollTo({ x: startAt * width, animated: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const done = () => {
    if (closing.current) return;
    closing.current = true;
    onClose();
  };
  const close = () => Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: false }).start(done);

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
            ]).start(done);
          } else {
            Animated.spring(dragY, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height],
  );

  const many = paths.length > 1 && !video;
  const bgOpacity = Animated.multiply(fade, dragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.35], extrapolate: 'clamp' }));
  const scale = dragY.interpolate({ inputRange: [0, 400], outputRange: [1, 0.86], extrapolate: 'clamp' });
  const chromeOpacity = Animated.multiply(fade, chromeA);

  return (
    <View style={s.root} accessibilityViewIsModal>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, s.black, { opacity: bgOpacity }]} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ translateY: dragY }, { scale }] }]} {...pan.panHandlers}>
        {video && paths[0] ? (
          <VideoView path={paths[0]} active contentFit="contain" />
        ) : paths.length > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))}
            style={StyleSheet.absoluteFill}
          >
            {paths.map((p, i) => (
              <Pressable key={`${p}-${i}`} accessibilityRole="button" accessibilityLabel={chrome ? 'Skjul knapperne' : 'Vis knapperne'} onPress={() => setChrome((c) => !c)} style={{ width, height }}>
                <Image
                  source={imageSource(p)}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  transition={200}
                  accessibilityLabel={many ? `${label} ${i + 1} af ${paths.length}` : label}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </Animated.View>

      {/* Toppen: luk og hvilket billede man er på */}
      <Animated.View style={[s.top, { paddingTop: insets.top + 8, opacity: chromeOpacity }]} pointerEvents={chrome ? 'box-none' : 'none'}>
        <Fade top />
        <Glass tint="dark" style={s.round}>
          <Pressable accessibilityRole="button" accessibilityLabel="Luk" onPress={close} style={s.roundBtn} hitSlop={6}>
            <Icon name="close" color="#fff" size={22} />
          </Pressable>
        </Glass>
        {many && (
          <Glass tint="dark" style={s.counter}>
            <T v="captionStrong" c="#fff" style={{ fontVariant: ['tabular-nums'] }}>
              {page + 1} / {paths.length}
            </T>
          </Glass>
        )}
      </Animated.View>

      {(footer || many) && (
        <Animated.View style={[s.bottom, { paddingBottom: insets.bottom + 12, paddingTop: footer ? 56 : 32, opacity: chromeOpacity }]} pointerEvents={chrome ? 'box-none' : 'none'}>
          <Fade />
          {many && (
            <View style={s.dots} accessible={false}>
              {paths.map((p, i) => (
                <View key={`${p}-${i}`} style={[s.dot, i === page && s.dotOn]} />
              ))}
            </View>
          )}
          {footer?.(page)}
        </Animated.View>
      )}
      {children}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  black: { backgroundColor: '#000' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 24 },
  round: { borderRadius: TAP / 2 },
  roundBtn: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  counter: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { backgroundColor: '#fff', width: 16 },
});
