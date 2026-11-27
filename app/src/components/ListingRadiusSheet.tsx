import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { MAX_KM, radiusText } from '@/lib/market';
import { color, radius, TAP } from '@/theme/tokens';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { T } from './T';

/** Til/fra-kontakt, 48 × 28 px (prototypens Toggle i create/parts) */
export function ListingToggle({ on }: { on: boolean }) {
  return (
    <View style={[s.toggle, on && { backgroundColor: color.actionPrimary }]}>
      <View style={[s.knob, on && { transform: [{ translateX: 20 }] }]} />
    </View>
  );
}

/** Torvet · Afstand: træk i linjen (1–100 km) eller vælg "Hele landet" (prototypens RadiusSheet) */
export function ListingRadiusSheet({ open, value, city, onClose, onApply }: { open: boolean; value: number | null; city: string; onClose: () => void; onApply: (km: number | null) => void }) {
  const [draft, setDraft] = useState<number | null>(value);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const km = draft ?? MAX_KM;
  const pct = (km - 1) / (MAX_KM - 1);
  const startPct = useRef(0);
  const ref = useRef({ draft, width });
  ref.current = { draft, width };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => ref.current.draft !== null,
        onMoveShouldSetPanResponder: () => ref.current.draft !== null,
        onPanResponderGrant: (e) => {
          // Tryk et sted på linjen hopper dertil
          const p = Math.min(1, Math.max(0, e.nativeEvent.locationX / ref.current.width));
          startPct.current = p;
          setDraft(Math.round(1 + p * (MAX_KM - 1)));
        },
        onPanResponderMove: (_e, g) => {
          const p = Math.min(1, Math.max(0, startPct.current + g.dx / ref.current.width));
          setDraft(Math.round(1 + p * (MAX_KM - 1)));
        },
      }),
    [],
  );

  const all = draft === null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Afstand"
      initialSize="auto"
      dim
      footer={
        <Button
          title="Vis resultater"
          block
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      }
    >
      <View style={s.body}>
        <View style={s.value}>
          <T v="titleL">{radiusText(draft)}</T>
          <T v="caption" c={color.textSecondary}>
            fra {city}
          </T>
        </View>
        <View
          style={[s.trackArea, all && { opacity: 0.35 }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width || 300)}
          {...pan.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel={`Afstand fra ${city} i km`}
          accessibilityValue={{ min: 1, max: MAX_KM, now: km }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => !all && setDraft(Math.min(MAX_KM, Math.max(1, km + (e.nativeEvent.actionName === 'increment' ? 5 : -5))))}
        >
          <View style={s.track} pointerEvents="none">
            <View style={[s.fill, { width: `${pct * 100}%` }]} />
          </View>
          <View style={[s.thumb, { left: pct * (width - 22) }]} pointerEvents="none" />
        </View>
        <View style={s.scale}>
          <T v="caption" c={color.textSecondary}>
            1 km
          </T>
          <T v="caption" c={color.textSecondary}>
            {MAX_KM} km
          </T>
        </View>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: all }} onPress={() => setDraft(all ? 25 : null)} style={s.all}>
          <T v="label">Hele landet</T>
          <ListingToggle on={all} />
        </Pressable>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { gap: 4, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  trackArea: { height: TAP, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, backgroundColor: color.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.textPrimary },
  thumb: {
    position: 'absolute',
    top: (TAP - 22) / 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.bgSurface,
    borderWidth: 1,
    borderColor: color.borderDefault,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  all: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: color.borderDefault },
  toggle: { width: 48, height: 28, flexShrink: 0, borderRadius: radius.pill, backgroundColor: color.actionOff },
  knob: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: color.bgSurface },
});
