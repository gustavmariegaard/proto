import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, BackHandler, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMe } from '@/lib/session';
import { color, radius, tabbarBar } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { T } from './T';

/** Genveje i Mere-arket, to pr. række, i samme rækkefølge som i prototypen */
const tiles: { label: string; icon: IconName; to: string }[] = [
  { label: 'Begivenheder', icon: 'calendar', to: '/begivenheder' },
  { label: 'Torvet', icon: 'shop', to: '/torvet' },
  { label: 'Grupper', icon: 'circles', to: '/grupper' },
  { label: 'Sider', icon: 'flag', to: '/sider' },
  { label: 'Gemt', icon: 'bookmark', to: '/gemt' },
  { label: 'Udvid cirkel', icon: 'user-plus', to: '/find-folk' },
];

/**
 * Mere-arket (prototypens MoreSheet): glider op over Hjem, mens bundmenuen
 * bliver liggende ovenpå. Luk ved at trykke på hinden, trække arket ned
 * eller trykke på håndtaget.
 */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(1)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    drag.setValue(0);
    slide.setValue(1);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    let off = () => {};
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
      window.addEventListener('keydown', onKey);
      off = () => window.removeEventListener('keydown', onKey);
    }
    return () => {
      sub.remove();
      off();
    };
  }, [open, slide, drag, fade]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        drag.setValue(0);
        if (g.dy > 80 || Math.abs(g.dy) < 6) closeRef.current();
      },
      onPanResponderTerminate: () => drag.setValue(0),
    }),
  ).current;

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };
  const name = me.name.trim() || 'Dit navn';
  const translateY = Animated.add(drag, slide.interpolate({ inputRange: [0, 1], outputRange: [0, 900] }));

  return (
    <View style={s.layer}>
      <Animated.View style={[StyleSheet.absoluteFill, s.scrim, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel="Mere"
        style={[s.sheet, { top: insets.top + 24, transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        <View style={s.spacer} pointerEvents="none" />
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.content, { paddingBottom: tabbarBar(insets.bottom) + 28 }]}
          bounces={false}
        >
          <View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Luk Mere" style={s.handle}>
            <View style={s.bar} />
          </View>
          <T v="titleL" accessibilityRole="header">
            Mere
          </T>

          <Pressable accessibilityRole="link" onPress={() => go('/profil')} style={({ pressed }) => [s.profile, pressed && s.pressed]}>
            <Avatar name={name} path={me.avatar_path} size="M" tone="blue" />
            <View style={s.profileText}>
              <T v="headingS" numberOfLines={1}>
                {name}
              </T>
              <T v="caption" c={color.textSecondary} numberOfLines={1}>
                Se din profil
              </T>
            </View>
            <Icon name="chevron-right" size={18} />
          </Pressable>

          <View style={s.tiles}>
            {tiles.map((t) => (
              <Pressable key={t.to} accessibilityRole="link" onPress={() => go(t.to)} style={({ pressed }) => [s.tile, pressed && s.pressed]}>
                <View style={s.tileIcon}>
                  <Icon name={t.icon} size={20} />
                </View>
                <T v="label" numberOfLines={1}>
                  {t.label}
                </T>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  /* Ligger over Hjem og topbaren, men under bundmenuen (z-index 20) */
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 },
  scrim: { backgroundColor: 'rgba(10,10,10,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  spacer: { flexShrink: 1 },
  scroll: {
    flexGrow: 0,
    backgroundColor: color.bgApp,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  content: { paddingHorizontal: 20, gap: 12 },
  handle: { height: 24, marginBottom: -10, paddingTop: 10, alignItems: 'center', justifyContent: 'flex-start' },
  bar: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '40%',
    height: 88,
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  tileIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: color.avatarBlueBg, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.98 }] },
});
