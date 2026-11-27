import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, shadow } from '@/theme/tokens';
import { T } from './T';

type Size = 'half' | 'full' | 'auto';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** half = 480 px (som i Figma), full = næsten hele skærmen, auto = så højt som indholdet (små menuer) */
  initialSize?: Size;
  /** Fast nederst, fx et tekstfelt */
  footer?: ReactNode;
  /** Mørk hinde bag arket */
  dim?: boolean;
  /** false = børnene ruller selv (fx en FlatList) */
  scroll?: boolean;
  children: ReactNode;
};

/**
 * Ark, der glider op nedefra (prototypens Sheet). Træk i håndtaget for at
 * gøre det højere eller lukke det. Tryk udenfor lukker.
 * Afvigelse fra prototypen: standard er "auto" og mørk hinde, fordi appens ark næsten alle er menuer.
 */
export function Sheet({ open, onClose, title, initialSize = 'auto', footer, dim = true, scroll = true, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const [size, setSize] = useState<Size>(initialSize);
  const drag = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setSize(initialSize);
    drag.setValue(0);
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, [open, initialSize, drag, slide]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => drag.setValue(Math.max(g.dy, -40)),
      onPanResponderRelease: (_, g) => {
        const d = g.dy;
        const cur = sizeRef.current;
        Animated.timing(drag, { toValue: 0, duration: 150, useNativeDriver: false }).start();
        if (cur === 'auto') {
          if (d > 80) closeRef.current();
          return;
        }
        // Et tryk på håndtaget skifter mellem halv og hel højde
        if (Math.abs(d) < 6) setSize((s) => (s === 'half' ? 'full' : 'half'));
        else if (d < -60) setSize('full');
        else if (d > 80) {
          if (cur === 'full') setSize('half');
          else closeRef.current();
        }
      },
      onPanResponderTerminate: () => drag.setValue(0),
    }),
  ).current;

  const full = H - insets.top - 26;
  const height = size === 'half' ? Math.min(480 + insets.bottom, H * 0.62) : size === 'full' ? full : undefined;
  const translateY = Animated.add(drag, slide.interpolate({ inputRange: [0, 1], outputRange: [0, H] }));

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.layer}>
        <Pressable style={[StyleSheet.absoluteFill, dim && s.dim]} onPress={onClose} accessibilityLabel="Luk" />
        <Animated.View
          accessibilityViewIsModal
          style={[s.sheet, { height, maxHeight: full, transform: [{ translateY }] }]}
        >
          <View
            {...pan.panHandlers}
            style={s.handle}
            accessibilityRole="button"
            accessibilityLabel={size === 'auto' ? 'Træk ned for at lukke' : size === 'half' ? 'Vis hele arket' : 'Gør arket mindre'}
          >
            <View style={s.bar} />
          </View>
          {title !== undefined && (
            <T v="headingM" style={s.title} accessibilityRole="header">
              {title}
            </T>
          )}
          {scroll ? (
            <ScrollView
              style={size === 'auto' ? s.bodyAuto : s.body}
              contentContainerStyle={!footer && size === 'auto' ? { paddingBottom: insets.bottom } : undefined}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={size === 'auto' ? s.bodyAuto : s.body}>{children}</View>
          )}
          {footer && <View style={[s.footer, { paddingBottom: Math.max(30, insets.bottom + 8) }]}>{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  dim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: color.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadow.sheet,
  },
  handle: { height: 27, paddingTop: 12, alignItems: 'center', flexShrink: 0 },
  bar: { width: 44, height: 5, borderRadius: 3, backgroundColor: color.borderStrong },
  title: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.borderDefault,
  },
  body: { flex: 1, minHeight: 0 },
  bodyAuto: { flexGrow: 0, flexShrink: 1 },
  footer: {
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
});
