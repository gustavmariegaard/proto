import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, shadow, tabbarBottom } from '@/theme/tokens';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';

export type TabName = 'index' | 'debat' | 'ny' | 'flicks' | 'mere';

/** Som i prototypen: Hjem, Offentlig debat, Opret, Flicks og Mere */
export const tabItems: { name: TabName; icon: IconName; label: string }[] = [
  { name: 'index', icon: 'home', label: 'Hjem' },
  { name: 'debat', icon: 'compass', label: 'Offentlig debat' },
  { name: 'ny', icon: 'plus', label: 'Opret' },
  { name: 'flicks', icon: 'clip', label: 'Flicks' },
  { name: 'mere', icon: 'more', label: 'Mere' },
];

/**
 * Flydende, rund bundmenu (prototypens TabBar): 52 px høj og 16 px fra skærmens kanter.
 * Den valgte fane fylder næsten hele højden. Kun ikoner; navnet læses op af skærmlæsere.
 */
export function TabBar({ current, onPress }: { current?: string; onPress: (name: TabName) => void }) {
  const insets = useSafeAreaInsets();
  const bottom = tabbarBottom(insets.bottom);
  // På Flicks står menuen altid fast
  const hidden = useHideOnScroll(current) && current !== 'flicks';
  // Flicks: mindre, mørkt glas, så videoen fylder mest muligt (som Instagram Reels)
  const compact = current === 'flicks';
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: hidden ? 1 : 0, duration: 280, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [hidden, anim]);
  return (
    <Animated.View
      style={[
        s.bar,
        compact && s.barCompact,
        {
          bottom,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 52 + bottom + 8] }) }],
        },
      ]}
      pointerEvents={hidden ? 'none' : 'box-none'}
    >
      <Glass tint={compact ? 'dark' : 'light'} style={compact ? [s.pill, s.pillCompact] : s.pill}>
      <View style={s.row} accessibilityRole="tablist" accessibilityLabel="Hovedmenu">
        {tabItems.map((it) => {
          const on = current === it.name;
          return (
            <Pressable
              key={it.name}
              accessibilityRole="tab"
              accessibilityLabel={it.label}
              accessibilityState={{ selected: on }}
              style={[s.tab, compact && s.tabCompact]}
              onPress={() => onPress(it.name)}
            >
              {({ pressed }) => (
                <View style={[s.holder, compact && s.holderCompact, on && (compact ? s.holderOnDark : s.holderOn), pressed && { transform: [{ scale: 0.94 }] }]}>
                  <Icon name={it.icon} size={compact ? 22 : 24} color={compact ? color.white : color.textPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      </Glass>
    </Animated.View>
  );
}

/* ---------- Glider væk ved scroll nedad, frem igen ved scroll opad (som prototypen) ---------- */
type Listener = (hidden: boolean) => void;
const listeners = new Set<Listener>();
const last = new WeakMap<object, number>();
let lastKey: object = {};

/** Kald fra en lodret ScrollView/FlatList (onScroll) på telefonen. På web lytter menuen selv. */
export function reportTabScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
  const t = e.currentTarget as unknown;
  track(t && typeof t === 'object' ? t : lastKey, contentOffset.y, contentSize.height - layoutMeasurement.height);
}

function track(key: object, top: number, range: number) {
  // Kun lodret rulning af hele sider (ikke vandrette rækker)
  if (range < 40) return;
  lastKey = key;
  const prev = last.get(key) ?? 0;
  const delta = top - prev;
  if (Math.abs(delta) < 6) return;
  last.set(key, top);
  const h = delta > 0 && top > 80;
  listeners.forEach((l) => l(h));
}

function useHideOnScroll(route?: string) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(false), [route]);
  useEffect(() => {
    listeners.add(setHidden);
    let off = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onScroll = (e: Event) => {
        const el = e.target as HTMLElement | null;
        if (!el || !(el instanceof HTMLElement)) return;
        track(el, el.scrollTop, el.scrollHeight - el.clientHeight);
      };
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
      off = () => document.removeEventListener('scroll', onScroll, { capture: true });
    }
    return () => {
      listeners.delete(setHidden);
      off();
    };
  }, []);
  return hidden;
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, zIndex: 20 },
  barCompact: { left: 44, right: 44 },
  /* Frostet glas i stedet for hvid (indholdet skinner igennem) */
  pill: { height: 52, borderRadius: 26, ...shadow.tabbar },
  pillCompact: { height: 44, borderRadius: 22, shadowOpacity: 0 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  tabCompact: { height: 42 },
  holderCompact: { height: 34, maxWidth: 56, borderRadius: 17 },
  holderOnDark: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tab: { flex: 1, height: 50, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  /* Den valgte fane: 42 px høj, op til 72 px bred */
  holder: { width: '100%', maxWidth: 72, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  holderOn: { backgroundColor: color.accentVerifiedBg },
});
