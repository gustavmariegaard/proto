import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Switch, View } from 'react-native';
import { MAX_KM, radiusText } from '@/lib/market';
import { color, radius, TAP } from '@/theme/tokens';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { T } from './T';

const TRACK = 280;

/** Torvet · Afstand: træk i linjen (1–100 km) eller vælg "Hele landet" */
export function ListingRadiusSheet({ open, value, city, onClose, onApply }: { open: boolean; value: number | null; city: string; onClose: () => void; onApply: (km: number | null) => void }) {
  const [draft, setDraft] = useState<number | null>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const km = draft ?? MAX_KM;
  const pct = (km - 1) / (MAX_KM - 1);
  const startPct = useRef(0);
  const ref = useRef({ km, draft });
  ref.current = { km, draft };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => ref.current.draft !== null,
        onMoveShouldSetPanResponder: () => ref.current.draft !== null,
        onPanResponderGrant: (e) => {
          // Tryk et sted på linjen hopper dertil
          const x = e.nativeEvent.locationX;
          const p = Math.min(1, Math.max(0, x / TRACK));
          startPct.current = p;
          setDraft(Math.round(1 + p * (MAX_KM - 1)));
        },
        onPanResponderMove: (_e, g) => {
          const p = Math.min(1, Math.max(0, startPct.current + g.dx / TRACK));
          setDraft(Math.round(1 + p * (MAX_KM - 1)));
        },
      }),
    [],
  );

  const all = draft === null;
  return (
    <Sheet open={open} onClose={onClose} title="Afstand">
      <View style={s.body}>
        <View style={s.value}>
          <T v="titleL">{radiusText(draft)}</T>
          <T v="caption" c={color.textSecondary}>
            fra {city}
          </T>
        </View>
        <View
          style={[s.trackArea, all && { opacity: 0.35 }]}
          {...pan.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel={`Afstand fra ${city} i km`}
          accessibilityValue={{ min: 1, max: MAX_KM, now: km }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => !all && setDraft(Math.min(MAX_KM, Math.max(1, km + (e.nativeEvent.actionName === 'increment' ? 5 : -5))))}
        >
          <View style={s.track}>
            <View style={[s.fill, { width: `${pct * 100}%` }]} />
          </View>
          <View style={[s.thumb, { left: pct * TRACK - 11 }]} />
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
          <Switch value={all} onValueChange={(v) => setDraft(v ? null : 25)} trackColor={{ true: color.actionPrimary, false: color.borderStrong }} thumbColor={color.white} />
        </Pressable>
        <Button
          title="Vis resultater"
          block
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, gap: 12, alignItems: 'stretch' },
  value: { alignItems: 'center', gap: 2, paddingBottom: 4 },
  trackArea: { width: TRACK, height: TAP, justifyContent: 'center', alignSelf: 'center' },
  track: { height: 3, borderRadius: radius.pill, backgroundColor: color.gray200, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.actionPrimary },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  scale: { width: TRACK, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  all: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP, paddingVertical: 4 },
});
