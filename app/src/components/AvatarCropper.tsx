import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as RNImage, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { pickImage } from '@/lib/media';
import { color, radius, TAP } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { T } from './T';

const MAX_ZOOM = 4;

type Props = { uri: string; onDone: (uri: string) => void; onCancel: () => void };

/**
 * Beskær profilbilledet til cirklen: træk billedet på plads og zoom med skyderen.
 * Virker ens på telefon og web. Resultatet er et kvadratisk JPEG på 400 × 400.
 */
export function AvatarCropper({ uri, onDone, onCancel }: Props) {
  const { width } = useWindowDimensions();
  const D = Math.min(width - 48, 320); // cirklens diameter
  const H = D + 64; // højden på arbejdsfladen
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    RNImage.getSize(uri, (w, h) => setSize({ w, h }), () => setSize({ w: 1, h: 1 }));
  }, [uri]);

  const base = size ? Math.max(D / size.w, D / size.h) : 1;
  const s = base * zoom;
  const dispW = (size?.w ?? 1) * s;
  const dispH = (size?.h ?? 1) * s;

  // Billedet skal altid dække hele cirklen
  const clamp = useCallback(
    (x: number, y: number, z = zoom) => {
      const w = (size?.w ?? 1) * base * z;
      const h = (size?.h ?? 1) * base * z;
      const mx = Math.max(0, (w - D) / 2);
      const my = Math.max(0, (h - D) / 2);
      return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) };
    },
    [size, base, zoom, D],
  );

  const start = useRef({ x: 0, y: 0 });
  const offRef = useRef(off);
  offRef.current = off;
  const clampRef = useRef(clamp);
  clampRef.current = clamp;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => (start.current = offRef.current),
        onPanResponderMove: (_e, g) => setOff(clampRef.current(start.current.x + g.dx, start.current.y + g.dy)),
      }),
    [],
  );

  const setZoomClamped = (z: number) => {
    const nz = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(nz);
    setOff((o) => clamp(o.x, o.y, nz));
  };

  // Skyderen
  const trackW = Math.min(width - 120, 260);
  const zStart = useRef(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const setZoomRef = useRef(setZoomClamped);
  setZoomRef.current = setZoomClamped;
  const slider = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => (zStart.current = zoomRef.current),
        onPanResponderMove: (_e, g) => setZoomRef.current(zStart.current + (g.dx / trackW) * (MAX_ZOOM - 1)),
      }),
    [trackW],
  );

  const done = async () => {
    if (!size) return;
    setBusy(true);
    const crop = D / s;
    const originX = Math.max(0, Math.round(size.w / 2 - off.x / s - crop / 2));
    const originY = Math.max(0, Math.round(size.h / 2 - off.y / s - crop / 2));
    const side = Math.min(Math.round(crop), size.w - originX, size.h - originY);
    const ctx = ImageManipulator.manipulate(uri);
    ctx.crop({ originX, originY, width: side, height: side }).resize({ width: 400, height: 400 });
    const out = await (await ctx.renderAsync()).saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    setBusy(false);
    onDone(out.uri);
  };

  const pct = (zoom - 1) / (MAX_ZOOM - 1);
  // Mørk flade med et cirkulært hul
  const hole = `M0 0H${width}V${H}H0Z M${width / 2 - D / 2} ${H / 2} a${D / 2} ${D / 2} 0 1 0 ${D} 0 a${D / 2} ${D / 2} 0 1 0 ${-D} 0Z`;

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={st.root}>
        <View style={st.top}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={st.topBtn}>
            <T v="label" c={color.white}>
              Annuller
            </T>
          </Pressable>
          <T v="headingM" c={color.white}>
            Tilpas billedet
          </T>
          <View style={st.topBtn} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ width, height: H, overflow: 'hidden' }} {...pan.panHandlers} accessibilityLabel="Træk for at flytte billedet">
            {size && (
              <RNImage
                source={{ uri }}
                style={{ position: 'absolute', width: dispW, height: dispH, left: width / 2 - dispW / 2 + off.x, top: H / 2 - dispH / 2 + off.y }}
              />
            )}
            <Svg width={width} height={H} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              <Path d={hole} fill="rgba(0,0,0,0.65)" fillRule="evenodd" />
              <Circle cx={width / 2} cy={H / 2} r={D / 2} stroke={color.accent} strokeWidth={2} fill="none" />
            </Svg>
          </View>
          <T v="caption" c="rgba(255,255,255,0.6)" style={{ textAlign: 'center', marginTop: 12 }}>
            Træk for at flytte
          </T>
        </View>

        <View style={st.zoomRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom ud" onPress={() => setZoomClamped(zoom - 0.25)} style={st.zoomBtn}>
            <T v="headingM" c={color.white}>
              –
            </T>
          </Pressable>
          <View
            style={{ width: trackW, height: TAP, justifyContent: 'center' }}
            {...slider.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel="Zoom"
            accessibilityValue={{ min: 100, max: MAX_ZOOM * 100, now: Math.round(zoom * 100) }}
          >
            <View style={st.track}>
              <View style={[st.fill, { width: `${pct * 100}%` }]} />
            </View>
            <View style={[st.thumb, { left: pct * trackW - 11 }]} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom ind" onPress={() => setZoomClamped(zoom + 0.25)} style={st.zoomBtn}>
            <Icon name="plus" color={color.white} size={20} />
          </Pressable>
        </View>

        <View style={{ padding: 24, paddingTop: 8 }}>
          <Button title="Brug billedet" variant="accent" block loading={busy} disabled={!size} onPress={done} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Vælg og beskær et profilbillede.
 * const { choose, cropper } = useAvatarPicker(setPhoto); … {cropper}
 */
export function useAvatarPicker(onPicked: (uri: string) => void) {
  const [raw, setRaw] = useState<string | null>(null);
  const choose = async () => {
    const a = await pickImage(false);
    if (a) setRaw(a.uri);
  };
  const cropper = raw ? (
    <AvatarCropper
      uri={raw}
      onCancel={() => setRaw(null)}
      onDone={(u) => {
        setRaw(null);
        onPicked(u);
      }}
    />
  ) : null;
  return { choose, cropper };
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: TAP + 8 },
  topBtn: { minWidth: 88, minHeight: TAP, justifyContent: 'center', paddingHorizontal: 8 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  zoomBtn: { width: TAP, height: TAP, borderRadius: TAP / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  track: { height: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.accent },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: color.white },
});
