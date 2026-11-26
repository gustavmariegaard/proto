import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { color } from '@/theme/tokens';

/* Fast "tilfældighed", så netværket ser ens ud hver gang */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type Node = { x: number; y: number; r: number };

/**
 * Levende netværk af grønne prikker og streger bag landingssiden
 * (samme idé som prototypens netværksgrafik). Glider langsomt op og ned,
 * og nogle prikker pulserer. Tager hensyn til "reducer bevægelse" på web.
 */
export function NetworkBackdrop() {
  const { width, height } = useWindowDimensions();
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const { nodes, lines } = useMemo(() => {
    const r = rng(7);
    const count = Math.round((width * height) / 9000);
    const nodes: Node[] = Array.from({ length: count }, () => ({
      x: r() * width,
      y: height * 0.62 + r() * height * 0.5,
      r: r() < 0.12 ? 5 : 2 + r() * 1.5,
    }));
    const lines: [Node, Node][] = [];
    nodes.forEach((a, i) => {
      const near = nodes
        .map((b, j) => ({ b, j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
        .filter((o) => o.j > i)
        .sort((p, q) => p.d - q.d)
        .slice(0, 2);
      near.forEach((o) => lines.push([a, o.b]));
    });
    return { nodes, lines };
  }, [width, height]);

  useEffect(() => {
    const reduce = Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const native = Platform.OS !== 'web';
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [drift, pulse]);

  const big = nodes.filter((n) => n.r >= 5);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {/* Grønt skær bag logoet */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="20%" cy="12%" r="70%">
            <Stop offset="0" stopColor={color.accent} stopOpacity="0.28" />
            <Stop offset="1" stopColor={color.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={width * 0.2} cy={height * 0.12} r={Math.max(width, height) * 0.7} fill="url(#glow)" />
      </Svg>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }] }]}
      >
        <Svg width={width} height={height * 1.1}>
          {lines.map(([a, b], i) => (
            <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color.accent} strokeOpacity={0.22} strokeWidth={1.2} />
          ))}
          {nodes.map((n, i) => (
            <Circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.r >= 5 ? '#0a0a0a' : color.accent} stroke={color.accent} strokeWidth={n.r >= 5 ? 2 : 0} opacity={0.85} />
          ))}
        </Svg>
        {/* Pulserende ringe om de store prikker (mennesker i netværket) */}
        {big.map((n, i) => (
          <Animated.View
            key={i}
            style={[
              s.ring,
              {
                left: n.x - 14,
                top: n.y - 14,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.1, 0.6] : [0.6, 0.1] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [0.8, 1.15] : [1.15, 0.8] }) }],
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* Mørkere i bunden, så knapperne står skarpt */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="fade" cx="50%" cy="100%" r="60%">
            <Stop offset="0" stopColor="#0a0a0a" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#0a0a0a" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={width / 2} cy={height * 1.05} r={height * 0.55} fill="url(#fade)" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  ring: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color.accent },
});
