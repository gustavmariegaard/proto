import { Image } from 'expo-image';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { imageSource } from '@/lib/media';
import type { PostCard } from '@/lib/types';
import { color, font } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { T } from './T';
import { VideoView } from './VideoView';

/* ---------- Udseendet af et delt opslag i et moment ---------- */

export type CardStyle = 'kort' | 'moerk' | 'medie' | 'kompakt';
export type Backdrop = 'sloeret' | 'mint' | 'sort' | 'lys';
export type Xf = { x: number; y: number; scale: number; rot: number };
export type MomentText = Xf & { id: string; text: string; color: string; box: boolean };
export type MomentLayout = Xf & { v: 1; style: CardStyle; bg: Backdrop; texts: MomentText[] };

export const cardStyles: { value: CardStyle; label: string }[] = [
  { value: 'kort', label: 'Kort' },
  { value: 'moerk', label: 'Mørkt kort' },
  { value: 'medie', label: 'Kun billedet' },
  { value: 'kompakt', label: 'Kompakt' },
];
export const backdrops: Backdrop[] = ['sloeret', 'mint', 'sort', 'lys'];
export const textColors = [color.white, color.ink900, color.green500, color.green200, '#ffd166', '#ff7a7a', '#7ab8ff'];

export const defaultLayout = (): MomentLayout => ({ v: 1, style: 'kort', bg: 'sloeret', x: 0.5, y: 0.46, scale: 1, rot: 0, texts: [] });

/** Gamle moments uden udseende, eller noget vi ikke kan læse: standard */
export function readLayout(raw: unknown): MomentLayout {
  const d = defaultLayout();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<MomentLayout>;
  const num = (n: unknown, f: number) => (typeof n === 'number' && isFinite(n) ? n : f);
  return {
    v: 1,
    style: cardStyles.some((c) => c.value === r.style) ? (r.style as CardStyle) : d.style,
    bg: backdrops.includes(r.bg as Backdrop) ? (r.bg as Backdrop) : d.bg,
    x: num(r.x, d.x),
    y: num(r.y, d.y),
    scale: num(r.scale, 1),
    rot: num(r.rot, 0),
    texts: Array.isArray(r.texts)
      ? r.texts
          .filter((t) => t && typeof t.text === 'string')
          .slice(0, 12)
          .map((t, i) => ({ id: String(t.id ?? i), text: t.text.slice(0, 200), color: typeof t.color === 'string' ? t.color : color.white, box: !!t.box, x: num(t.x, 0.5), y: num(t.y, 0.2), scale: num(t.scale, 1), rot: num(t.rot, 0) }))
      : [],
  };
}

/** Alle mål er lavet til en 390 pt bred skærm og skaleres til den aktuelle */
const REF = 390;
export const isDark = (c: string) => c === color.ink900 || c === color.green700;
/** Tekstfarve oven på en farvet boks */
export const onBox = (c: string) => (c === color.white || c === color.green200 || c === color.green500 || c === '#ffd166' ? color.ink900 : color.white);

/* ---------- Lærredet ---------- */

type Props = {
  layout: MomentLayout;
  post: PostCard;
  /** Videoen spiller (pause, når man holder fingeren nede) */
  playing?: boolean;
  /** Teksten, der er ved at blive skrevet, vises ikke på lærredet */
  hideText?: string | null;
  /** Kun i editoren: træk, knib og tryk */
  edit?: {
    setLayout: (fn: (l: MomentLayout) => MomentLayout) => void;
    onTapPost: () => void;
    onTapText: (id: string) => void;
    onDragText: (dragging: boolean, overTrash: boolean) => void;
    onDropText: (id: string, overTrash: boolean) => void;
    onGuides: (g: { v: boolean; h: boolean }) => void;
  };
  children?: ReactNode;
};

/**
 * Et delt opslag som moment: baggrund, opslaget (flyttet, skaleret og drejet) og tekster henover.
 * Bruges både i editoren ("Del som moment") og når momentet vises.
 */
export function MomentCanvas({ layout, post, playing = true, hideText, edit, children }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const k = size.w ? size.w / REF : 1;
  const image = post.media_type !== 'video' ? post.image_paths[0] : undefined;

  const setPost = (xf: Xf) => edit?.setLayout((l) => ({ ...l, ...xf }));
  const setText = (id: string) => (xf: Xf) => edit?.setLayout((l) => ({ ...l, texts: l.texts.map((t) => (t.id === id ? { ...t, ...xf } : t)) }));

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Backdrop bg={layout.bg} image={image} />
      {/* To fingre et vilkårligt sted på baggrunden: skalér og drej opslaget */}
      {edit && <PinchArea size={size} get={() => layout} set={setPost} />}
      {size.w > 0 && (
        <>
          <Movable xf={layout} size={size} edit={edit && { set: setPost, onTap: edit.onTapPost, onGuides: edit.onGuides }}>
            <PostLook post={post} style={layout.style} k={k} playing={playing} />
          </Movable>
          {layout.texts
            .filter((t) => t.id !== hideText)
            .map((t) => (
              <Movable
                key={t.id}
                xf={t}
                size={size}
                edit={
                  edit && {
                    set: setText(t.id),
                    onTap: () => edit.onTapText(t.id),
                    onGuides: edit.onGuides,
                    onDrag: edit.onDragText,
                    onDrop: (over) => edit.onDropText(t.id, over),
                  }
                }
              >
                <TextLook t={t} k={k} />
              </Movable>
            ))}
        </>
      )}
      {children}
    </View>
  );
}

/* ---------- Baggrunde ---------- */

function Backdrop({ bg, image }: { bg: Backdrop; image?: string }) {
  if (bg === 'sloeret' && image) {
    return (
      <View style={[StyleSheet.absoluteFill, s.clip]} pointerEvents="none">
        <Image source={imageSource(image)} style={s.blur} contentFit="cover" blurRadius={30} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} />
      </View>
    );
  }
  const stops: Record<Backdrop, [string, string]> = {
    sloeret: [color.green900, color.ink900],
    mint: [color.green300, color.green100],
    sort: [color.ink700, color.ink900],
    lys: [color.white, color.gray150],
  };
  const [a, b] = stops[bg];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`mc-bg-${bg}`} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#mc-bg-${bg})`} />
      </Svg>
    </View>
  );
}

/** Baggrundens farve i små runde knapper (editoren) */
export function BackdropSwatch({ bg, image, size = 22 }: { bg: Backdrop; image?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 2, borderColor: color.white }}>
      <Backdrop bg={bg} image={image} />
    </View>
  );
}

/* ---------- Opslaget i de fire udseender ---------- */

function PostLook({ post, style, k, playing }: { post: PostCard; style: CardStyle; k: number; playing: boolean }) {
  const media = post.image_paths[0];
  const video = post.media_type === 'video' && !!media;
  const w = 300 * k;
  const dark = style === 'moerk';
  const fg = dark ? color.white : color.textPrimary;
  const sub = dark ? 'rgba(255,255,255,0.7)' : color.textSecondary;
  const mediaEl = (h: number, r: number) =>
    media ? (
      <View style={{ width: '100%', height: h, borderRadius: r, overflow: 'hidden', backgroundColor: color.ink900 }}>
        {video ? <VideoView path={media} active={playing} contentFit="cover" /> : <Image source={imageSource(media)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}
      </View>
    ) : null;

  if (style === 'medie') {
    // Kun billedet/videoen med et lille navneskilt. Uden billede: teksten stort.
    return (
      <View style={{ width: w, alignItems: 'flex-start' }}>
        {media ? (
          <View style={[s.lift, { width: '100%', borderRadius: 22 * k }]}>{mediaEl(w * (video ? 16 / 9 : 5 / 4), 22 * k)}</View>
        ) : (
          <View style={[s.lift, { width: '100%', padding: 22 * k, borderRadius: 22 * k, backgroundColor: color.green500 }]}>
            <T style={{ fontFamily: font.title, fontSize: 24 * k, lineHeight: 30 * k, color: color.ink900 }} numberOfLines={8}>
              {post.text}
            </T>
          </View>
        )}
        <View style={[s.tag, { marginTop: -14 * k, marginLeft: 12 * k, paddingHorizontal: 10 * k, paddingVertical: 5 * k, gap: 6 * k }]}>
          <Avatar name={post.author_name} path={post.author_avatar_path} size={18 * k} />
          <T style={{ fontFamily: font.bodyBold, fontSize: 12 * k, color: color.ink900 }} numberOfLines={1}>
            @{post.author_username}
          </T>
        </View>
      </View>
    );
  }

  if (style === 'kompakt') {
    return (
      <View style={[s.lift, s.row, { width: w * 0.92, padding: 10 * k, gap: 10 * k, borderRadius: 20 * k, backgroundColor: color.white }]}>
        {media ? (
          <View style={{ width: 64 * k }}>{mediaEl(64 * k, 14 * k)}</View>
        ) : (
          <View style={[s.center, { width: 64 * k, height: 64 * k, borderRadius: 14 * k, backgroundColor: color.noteBg }]}>
            <Icon name="note" size={24 * k} color={color.green700} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 * k }}>
          <T style={{ fontFamily: font.bodyBold, fontSize: 14 * k, color: color.ink900 }} numberOfLines={1}>
            {post.author_name}
          </T>
          <T style={{ fontFamily: font.body, fontSize: 13 * k, lineHeight: 18 * k, color: color.textSecondary }} numberOfLines={2}>
            {post.text || `@${post.author_username}`}
          </T>
        </View>
      </View>
    );
  }

  // Kort / mørkt kort
  return (
    <View style={[s.lift, { width: w, padding: 12 * k, gap: 8 * k, borderRadius: 22 * k, backgroundColor: dark ? color.ink900 : color.white }]}>
      <View style={[s.row, { gap: 8 * k }]}>
        <Avatar name={post.author_name} path={post.author_avatar_path} size={32 * k} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ fontFamily: font.bodyBold, fontSize: 15 * k, lineHeight: 20 * k, color: fg }} numberOfLines={1}>
            {post.author_name}
          </T>
          <T style={{ fontFamily: font.body, fontSize: 12 * k, lineHeight: 16 * k, color: sub }} numberOfLines={1}>
            @{post.author_username}
          </T>
        </View>
      </View>
      {!!post.text && (
        <T style={{ fontFamily: font.body, fontSize: 14 * k, lineHeight: 20 * k, color: fg }} numberOfLines={media ? 3 : 8}>
          {post.text}
        </T>
      )}
      {mediaEl(video ? w * 1.1 : w * 0.95, 14 * k)}
    </View>
  );
}

/* ---------- Tekst henover ---------- */

export function TextLook({ t, k }: { t: Pick<MomentText, 'text' | 'color' | 'box'>; k: number }) {
  const size = 28 * k;
  return (
    <View style={[{ maxWidth: 330 * k, paddingHorizontal: 12 * k, paddingVertical: 6 * k, borderRadius: 12 * k }, t.box && { backgroundColor: t.color }]}>
      <T
        style={[
          { fontFamily: font.title, fontSize: size, lineHeight: size * 1.18, textAlign: 'center', color: t.box ? onBox(t.color) : t.color },
          !t.box && !isDark(t.color) && s.textShadow,
        ]}
      >
        {t.text}
      </T>
    </View>
  );
}

/* ---------- Træk, knib og drej ---------- */

const touchesOf = (e: GestureResponderEvent) => {
  const ts = (e.nativeEvent.touches ?? []) as unknown as { pageX: number; pageY: number }[];
  return Array.from(ts);
};
const geo = (ts: { pageX: number; pageY: number }[]) => {
  const [a, b] = ts;
  const dx = b.pageX - a.pageX;
  const dy = b.pageY - a.pageY;
  return { dist: Math.hypot(dx, dy) || 1, angle: (Math.atan2(dy, dx) * 180) / Math.PI, mx: (a.pageX + b.pageX) / 2, my: (a.pageY + b.pageY) / 2 };
};
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
/** Skraldespanden nederst i midten (til tekster) */
const overTrash = (pageX: number, pageY: number, size: { w: number; h: number }) => pageY > size.h - 150 && Math.abs(pageX - size.w / 2) < 90;

type Handlers = {
  set: (xf: Xf) => void;
  onTap?: () => void;
  onGuides?: (g: { v: boolean; h: boolean }) => void;
  onDrag?: (dragging: boolean, overTrash: boolean) => void;
  onDrop?: (overTrash: boolean) => void;
};

function useTransform(get: () => Xf, size: { w: number; h: number }, h?: Handlers) {
  const ref = useRef({ get, size, h });
  ref.current = { get, size, h };
  return useMemo(() => {
    let start: Xf = { x: 0, y: 0, scale: 1, rot: 0 };
    let base = { dx: 0, dy: 0 };
    let pinch: (ReturnType<typeof geo> & { xf: Xf }) | null = null;
    let moved = false;
    let t0 = 0;
    let last = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!ref.current.h,
      onMoveShouldSetPanResponder: () => !!ref.current.h,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        start = { ...ref.current.get() };
        base = { dx: 0, dy: 0 };
        pinch = null;
        moved = false;
        t0 = Date.now();
        last = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      },
      onPanResponderMove: (e, g) => {
        const { size: sz, h: hh } = ref.current;
        if (!hh || !sz.w) return;
        const ts = touchesOf(e);
        if (ts.length >= 2) {
          const now = geo(ts);
          if (!pinch) pinch = { ...now, xf: { ...ref.current.get() } };
          moved = true;
          let rot = pinch.xf.rot + (now.angle - pinch.angle);
          if (Math.abs(((rot % 360) + 360) % 360) < 4 || Math.abs((((rot % 360) + 360) % 360) - 360) < 4) rot = 0;
          hh.set({
            scale: clamp((pinch.xf.scale * now.dist) / pinch.dist, 0.35, 4),
            rot,
            x: clamp(pinch.xf.x + (now.mx - pinch.mx) / sz.w, 0, 1),
            y: clamp(pinch.xf.y + (now.my - pinch.my) / sz.h, 0, 1),
          });
          return;
        }
        if (pinch) {
          // Fra to fingre til én: fortsæt herfra uden at hoppe
          pinch = null;
          start = { ...ref.current.get() };
          base = { dx: g.dx, dy: g.dy };
        }
        if (!moved && Math.abs(g.dx) + Math.abs(g.dy) < 6) return;
        moved = true;
        let x = start.x + (g.dx - base.dx) / sz.w;
        let y = start.y + (g.dy - base.dy) / sz.h;
        // Hjælpelinjer: klik på plads i midten
        const v = Math.abs(x - 0.5) < 0.02;
        const hz = Math.abs(y - 0.5) < 0.012;
        if (v) x = 0.5;
        if (hz) y = 0.5;
        hh.onGuides?.({ v, h: hz });
        last = { x: g.moveX, y: g.moveY };
        hh.onDrag?.(true, overTrash(g.moveX, g.moveY, sz));
        hh.set({ ...ref.current.get(), x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
      },
      onPanResponderRelease: () => {
        const { size: sz, h: hh } = ref.current;
        hh?.onGuides?.({ v: false, h: false });
        if (!moved && Date.now() - t0 < 350) {
          hh?.onTap?.();
          return;
        }
        hh?.onDrag?.(false, false);
        hh?.onDrop?.(overTrash(last.x, last.y, sz));
      },
      onPanResponderTerminate: () => {
        ref.current.h?.onGuides?.({ v: false, h: false });
        ref.current.h?.onDrag?.(false, false);
      },
    });
  }, []);
}

function Movable({ xf, size, edit, children }: { xf: Xf; size: { w: number; h: number }; edit?: Handlers; children: ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const pan = useTransform(() => xf, size, edit);
  return (
    <View
      {...(edit ? pan.panHandlers : {})}
      pointerEvents={edit ? 'box-only' : 'none'}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[
        s.movable,
        { left: xf.x * size.w - box.w / 2, top: xf.y * size.h - box.h / 2, opacity: box.w ? 1 : 0, transform: [{ rotate: `${xf.rot}deg` }, { scale: xf.scale }] },
        edit && ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object),
      ]}
    >
      {children}
    </View>
  );
}

/** Baggrunden i editoren: knib med to fingre for at skalere og dreje opslaget */
function PinchArea({ size, get, set }: { size: { w: number; h: number }; get: () => Xf; set: (xf: Xf) => void }) {
  const ref = useRef({ get, set, size });
  ref.current = { get, set, size };
  const pan = useMemo(() => {
    let pinch: (ReturnType<typeof geo> & { xf: Xf }) | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: (e) => touchesOf(e).length >= 2,
      onMoveShouldSetPanResponder: (e) => touchesOf(e).length >= 2,
      onPanResponderGrant: () => {
        pinch = null;
      },
      onPanResponderMove: (e) => {
        const ts = touchesOf(e);
        if (ts.length < 2) return;
        const now = geo(ts);
        if (!pinch) pinch = { ...now, xf: { ...ref.current.get() } };
        ref.current.set({ ...pinch.xf, scale: clamp((pinch.xf.scale * now.dist) / pinch.dist, 0.35, 4), rot: pinch.xf.rot + (now.angle - pinch.angle) });
      },
    });
  }, []);
  return <View style={[StyleSheet.absoluteFill, { touchAction: 'none' } as object]} {...pan.panHandlers} />;
}

/** Skraldespanden, mens man trækker en tekst */
export function TrashTarget({ active }: { active: boolean }) {
  return (
    <View style={s.trashWrap} pointerEvents="none">
      <View style={[s.trash, active && s.trashOn]}>
        <Icon name="close" size={active ? 26 : 22} color={active ? color.ink900 : color.white} stroke={2.5} />
      </View>
    </View>
  );
}

/** Lodret og vandret hjælpelinje i midten */
export function Guides({ v, h }: { v: boolean; h: boolean }) {
  return (
    <>
      {v && <View pointerEvents="none" style={[s.guide, { top: 0, bottom: 0, left: '50%', width: 1 }]} />}
      {h && <View pointerEvents="none" style={[s.guide, { left: 0, right: 0, top: '50%', height: 1 }]} />}
    </>
  );
}

/** Lille knap i editoren */
export function CanvasButton({ label, onPress, children, on }: { label: string; onPress: () => void; children: ReactNode; on?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [s.cbtn, on && s.cbtnOn, pressed && { transform: [{ scale: 0.94 }] }]}>
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  clip: { overflow: 'hidden' },
  blur: { position: 'absolute', top: -40, left: -40, right: -40, bottom: -40 },
  movable: { position: 'absolute' },
  lift: { boxShadow: '0 14px 40px rgba(0,0,0,0.32)' } as object,
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: color.white, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' } as object,
  textShadow: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  trashWrap: { position: 'absolute', left: 0, right: 0, bottom: 56, alignItems: 'center' },
  trash: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(0,0,0,0.35)' },
  trashOn: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.white, borderColor: color.white },
  guide: { position: 'absolute', backgroundColor: color.green500, opacity: 0.9 },
  cbtn: { minWidth: 44, height: 44, paddingHorizontal: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.32)' },
  cbtnOn: { backgroundColor: color.white },
});
