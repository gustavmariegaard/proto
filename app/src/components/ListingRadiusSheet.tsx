import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { cities, MAX_KM, radiusText } from '@/lib/market';
import { color, radius, TAP } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
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

/** Afstand ↔ position på linjen: kvadratisk, så de korte afstande er nemme at ramme præcist */
const toKm = (p: number) => { const k = 1 + p * p * (MAX_KM - 1); return k < 50 ? Math.round(k) : Math.round(k / 5) * 5; };
const toPct = (km: number) => Math.sqrt((km - 1) / (MAX_KM - 1));

/** Torvet · Afstand: træk i linjen (1–500 km) eller vælg "Hele landet" (prototypens RadiusSheet) */
type Props = {
  open: boolean;
  value: number | null;
  city: string;
  /** live = telefonens placering lige nu, manual = valgt by, none = ingen placering */
  source?: 'live' | 'manual' | 'none';
  onClose: () => void;
  onApply: (km: number | null) => void;
  /** Vælg en by (null = brug min placering igen) */
  onPickCity?: (name: string | null) => void;
};

export function ListingRadiusSheet({ open, value, city, source = 'live', onClose, onApply, onPickCity }: Props) {
  const [draft, setDraft] = useState<number | null>(value);
  const [width, setWidth] = useState(300);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (open) {
      setDraft(value);
      setPicking(source === 'none');
    }
  }, [open, value, source]);

  const km = draft ?? MAX_KM;
  const pct = toPct(km);
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
          setDraft(toKm(p));
        },
        onPanResponderMove: (_e, g) => {
          const p = Math.min(1, Math.max(0, startPct.current + g.dx / ref.current.width));
          setDraft(toKm(p));
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
        {/* Hvorfra regnes afstanden: din placering lige nu, eller en by du har valgt */}
        {onPickCity && (
          <View style={s.place}>
            {source !== 'none' && (
              <View style={s.placeRow}>
                <View style={s.placeTile}>
                  <Icon name="pin" size={18} color={color.green700} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="label" numberOfLines={1}>
                    {city}
                  </T>
                  <T v="caption" c={color.textSecondary}>
                    {source === 'live' ? 'Din placering lige nu' : 'Valgt by'}
                  </T>
                </View>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: picking }} onPress={() => setPicking(!picking)} hitSlop={8} style={s.placeBtn}>
                  <T v="captionStrong">{picking ? 'Luk' : 'Skift by'}</T>
                </Pressable>
              </View>
            )}
            {source === 'manual' && (
              <Pressable accessibilityRole="button" onPress={() => (onPickCity(null), onClose())} style={s.useMine}>
                <Icon name="pin" size={16} />
                <T v="label" style={{ textDecorationLine: 'underline' }}>
                  Brug min placering
                </T>
              </Pressable>
            )}
            {picking && (
              <View style={s.cities} accessibilityLabel="Vælg by">
                {source === 'none' && (
                  <T v="caption" c={color.textSecondary} style={{ width: '100%' }}>
                    Vælg den by, afstanden skal regnes fra:
                  </T>
                )}
                {cities.map((c) => {
                  const on = source !== 'none' && c.name === city;
                  return (
                    <Pressable
                      key={c.name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        onPickCity(c.name);
                        setPicking(false);
                      }}
                      style={({ pressed }) => [s.cityChip, on && s.cityOn, pressed && { opacity: 0.8 }]}
                    >
                      <T v="captionStrong" c={on ? color.textOnAction : color.textPrimary}>
                        {c.name}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
        {source !== 'none' && (
        <>
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
          onAccessibilityAction={(e) => !all && setDraft(Math.min(MAX_KM, Math.max(1, km + (e.nativeEvent.actionName === 'increment' ? 1 : -1) * (km < 50 ? 5 : 25))))}
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
        </>
        )}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  place: { gap: 10, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeTile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg, borderWidth: 1, borderColor: color.accentBg },
  placeBtn: { minHeight: 32, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderStrong },
  useMine: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
  cities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cityChip: { minHeight: 34, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  cityOn: { backgroundColor: color.actionPrimary },
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
