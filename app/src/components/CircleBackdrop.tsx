import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color } from '@/theme/tokens';

const reduceMotion = () => Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Baggrund til landingssiden: koncentriske ringe ("din cirkel") øverst til højre.
 * Ringe breder sig langsomt som i vand, og få prikker kredser hver i sin bane.
 */
/** Højden på den bløde overgang øverst */
const TOP_FADE = 120;

export function CircleBackdrop({ fadeTo = color.bgApp }: { fadeTo?: string }) {
  const { width, height } = useWindowDimensions();
  const cx = width * 0.92;
  const cy = height * 0.14;
  const max = Math.max(width, height) * 0.95;
  const ripple = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion()) return;
    const native = Platform.OS !== 'web';
    const loops = ripple.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 2600),
          Animated.timing(v, { toValue: 1, duration: 7800, easing: Easing.out(Easing.quad), useNativeDriver: native }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
        ]),
      ),
    );
    const orbit = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: native }));
    loops.forEach((l) => l.start());
    orbit.start();
    return () => {
      loops.forEach((l) => l.stop());
      orbit.stop();
    };
  }, [ripple, spin]);

  // Faste ringe: tættere ved midten, tyndere og svagere udad
  const rings = [0.16, 0.27, 0.4, 0.55, 0.72, 0.9].map((f, i) => ({ r: max * f, o: 0.3 - i * 0.04 }));
  // Prikker, der kredser: radius, størrelse, startvinkel og retning
  const dots = [
    // Vinkel 0 = vandret til venstre for midten (inde på skærmen); negativ = nedad
    { r: rings[1].r, size: 10, start: -30, dir: 1, speed: 1.6 },
    { r: rings[2].r, size: 7, start: -75, dir: -1, speed: 1.1 },
    { r: rings[3].r, size: 12, start: -10, dir: 1, speed: 0.8 },
    { r: rings[4].r, size: 6, start: -50, dir: -1, speed: 0.6 },
    { r: rings[5].r, size: 9, start: -85, dir: 1, speed: 0.45 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="core" cx={cx} cy={cy} r={max * 0.5} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={max * 0.5} fill="url(#core)" />
        {rings.map((g, i) => (
          <Circle key={i} cx={cx} cy={cy} r={g.r} stroke={color.green700} strokeOpacity={g.o} strokeWidth={1.2} fill="none" />
        ))}
        <Circle cx={cx} cy={cy} r={7} fill={color.accent} />
      </Svg>

      {/* Ringe i vand */}
      {ripple.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            s.ripple,
            {
              width: max,
              height: max,
              borderRadius: max / 2,
              left: cx - max / 2,
              top: cy - max / 2,
              opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }],
            },
          ]}
        />
      ))}

      {/* Prikker i kredsløb */}
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: cx - d.r,
            top: cy - d.r,
            width: d.r * 2,
            height: d.r * 2,
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${d.start}deg`, `${d.start + d.dir * 360 * d.speed}deg`],
                }),
              },
            ],
          }}
        >
          <View style={[s.dot, { width: d.size, height: d.size, borderRadius: d.size / 2, left: -d.size / 2, top: d.r - d.size / 2 }]} />
        </Animated.View>
      ))}
      {/* Blød overgang øverst til baggrundsfarven, så browserens bjælke ikke skærer en hård kant */}
      <Svg width={width} height={TOP_FADE} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fadeTo} stopOpacity="1" />
            <Stop offset="1" stopColor={fadeTo} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={TOP_FADE} fill="url(#topfade)" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  ripple: { position: 'absolute', borderWidth: 1.5, borderColor: color.green700 },
  dot: { position: 'absolute', backgroundColor: color.accent, shadowColor: color.accent, shadowOpacity: 0.9, shadowRadius: 8 },
});
