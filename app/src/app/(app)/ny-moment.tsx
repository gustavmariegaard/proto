import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView as ExpoVideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Button } from '@/components/Button';
import { CreateButton, CreateShell, MediaFrame, OptionRow } from '@/components/CreateFlow';
import { Icon } from '@/components/Icon';
import { backdrops, BackdropSwatch, CanvasButton, cardStyles, defaultLayout, Guides, MomentCanvas, onBox, textColors, TrashTarget, type MomentLayout } from '@/components/MomentCanvas';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { pickMedia, uploadImage, uploadVideo } from '@/lib/media';
import { getPost } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { useBlackChrome } from '@/lib/useDarkChrome';
import { color, font, radius } from '@/theme/tokens';

type Captured = { uri: string; mime: string; video: boolean };

/**
 * Nyt moment. Forsvinder efter 24 timer. ?side=<id> laver det som en side, du er admin for.
 * - Uden ?opslag: prototypens "Nyt moment" (NewFlick som moment): tag et foto/en video eller vælg fra billeder, og del.
 * - ?opslag=<id>: prototypens "Del som moment" (MomentComposer): opslaget som kort i fuld skærm.
 */
export default function NewMoment() {
  const { opslag } = useLocalSearchParams<{ opslag?: string; side?: string }>();
  return opslag ? <ShareMoment postId={opslag} /> : <Camera />;
}

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

function useShare() {
  const me = useMe();
  const { side } = useLocalSearchParams<{ side?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const share = async (media: Captured | null, postId: string | null, layout?: MomentLayout) => {
    setBusy(true);
    setError('');
    try {
      const media_path = media ? (media.video ? await uploadVideo(me.id, media.uri, media.mime) : await uploadImage(me.id, media.uri, media.mime, 'opslag')) : null;
      const row = {
        author_id: me.id,
        page_id: side ?? null,
        post_id: postId,
        media_path,
        media_type: media?.video ? 'video' : 'image',
        text: '',
      };
      let { error } = await supabase.from('moments').insert((layout ? { ...row, layout } : row) as typeof row);
      // Databasen er ikke opdateret endnu (ingen layout-kolonne): del uden udseende
      if (error && layout && /layout/.test(error.message ?? '')) ({ error } = await supabase.from('moments').insert(row));
      if (error) throw error;
      router.replace('/');
    } catch {
      setError('Momentet kunne ikke deles. Prøv igen.');
      setBusy(false);
    }
  };
  return { busy, error, share };
}

/* ---------- Nyt moment (søgeren) ---------- */

function Camera() {
  const { side } = useLocalSearchParams<{ side?: string }>();
  const [captured, setCaptured] = useState<Captured | null>(null);
  const { busy, error, share } = useShare();

  const fromAsset = (a: ImagePicker.ImagePickerAsset | null | undefined) => {
    if (!a) return;
    const video = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
    setCaptured({ uri: a.uri, mime: a.mimeType ?? (video ? 'video/mp4' : 'image/jpeg'), video });
  };
  // Telefonens eget kamera (på web: filvælgeren med kamera)
  const camera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (perm && !perm.granted) return fromAsset(await pickMedia(true));
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8, videoMaxDuration: 60 }).catch(() => null);
    if (res && !res.canceled) fromAsset(res.assets?.[0]);
  };
  const gallery = async () => fromAsset(await pickMedia(true));

  /* Trin 2: se det, og del */
  if (captured) {
    return (
      <CreateShell
        kind="moment"
        progress={[2, 2]}
        kicker="Trin 2 af 2"
        title="Klar til at dele"
        lead={side ? 'Momentet vises på siden i 24 timer.' : 'Dem, der følger dig, kan se dit moment i 24 timer.'}
        onClose={() => setCaptured(null)}
        closeIcon="chevron-left"
        closeLabel="Tilbage"
        footer={
          <>
            {!!error && (
              <T v="bodyS" c={color.danger} accessibilityLiveRegion="polite">
                {error}
              </T>
            )}
            <CreateButton loading={busy} onPress={() => share(captured, null)}>
              Del moment
            </CreateButton>
          </>
        }
      >
        <MediaFrame ratio={9 / 16} width={220} onRemove={() => setCaptured(null)} removeLabel="Kassér">
          {captured.video ? (
            <LocalVideo uri={captured.uri} />
          ) : (
            <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Dit billede" />
          )}
        </MediaFrame>
      </CreateShell>
    );
  }

  /* Trin 1: tag eller vælg et foto/en video */
  return (
    <CreateShell kind="moment" switchable={!side} kicker="Trin 1 af 2" title="Nyt moment" lead="Et moment forsvinder igen efter 24 timer." onClose={close}>
      <View style={s.list}>
        <OptionRow icon="camera" title="Tag et foto eller en video" onPress={camera} />
        <OptionRow icon="image" title="Vælg fra kamerarullen" onPress={gallery} />
      </View>
    </CreateShell>
  );
}

/** Den valgte video (fra telefonen) */
function LocalVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <ExpoVideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} accessibilityLabel="Din video" />;
}

/* ---------- Del som moment ---------- */

/**
 * Editoren (som stories på Instagram): opslaget på en baggrund.
 * Tryk på opslaget skifter udseende, træk flytter, to fingre skalerer og drejer.
 * "Aa" skriver tekst henover; teksten kan flyttes, og trækkes ned i skraldespanden for at slettes.
 */
function ShareMoment({ postId }: { postId: string }) {
  useBlackChrome();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<PostCard | null | undefined>(undefined);
  const [layout, setLayout] = useState<MomentLayout>(defaultLayout);
  const [editing, setEditing] = useState<{ id: string; text: string; color: string; box: boolean; isNew: boolean } | null>(null);
  const [drag, setDrag] = useState({ on: false, over: false });
  const [guides, setGuides] = useState({ v: false, h: false });
  const [toast, setToast] = useState('');
  const [hint, setHint] = useState(true);
  const { busy, error, share } = useShare();

  useEffect(() => {
    getPost(postId).then(setPost);
  }, [postId]);
  // Kort vejledning, der forsvinder af sig selv
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 4500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1200);
    return () => clearTimeout(t);
  }, [toast]);

  const image = post && post.media_type !== 'video' ? post.image_paths[0] : undefined;
  const bgs = backdrops.filter((b) => b !== 'sloeret' || image);

  const nextStyle = () => {
    setHint(false);
    setLayout((l) => {
      const i = cardStyles.findIndex((c) => c.value === l.style);
      const next = cardStyles[(i + 1) % cardStyles.length];
      setToast(next.label);
      return { ...l, style: next.value };
    });
  };
  const nextBg = () => setLayout((l) => ({ ...l, bg: bgs[(bgs.indexOf(l.bg) + 1) % bgs.length] ?? bgs[0] }));

  const startText = () => {
    setHint(false);
    setEditing({ id: String(Date.now()), text: '', color: textColors[0], box: false, isNew: true });
  };
  const editText = (id: string) => {
    const t = layout.texts.find((x) => x.id === id);
    if (t) setEditing({ id, text: t.text, color: t.color, box: t.box, isNew: false });
  };
  const doneText = () => {
    if (!editing) return;
    const text = editing.text.trim();
    setLayout((l) => {
      if (!text) return { ...l, texts: l.texts.filter((t) => t.id !== editing.id) };
      if (editing.isNew) return { ...l, texts: [...l.texts, { id: editing.id, text, color: editing.color, box: editing.box, x: 0.5, y: 0.2, scale: 1, rot: 0 }] };
      return { ...l, texts: l.texts.map((t) => (t.id === editing.id ? { ...t, text, color: editing.color, box: editing.box } : t)) };
    });
    setEditing(null);
  };

  if (post === null) {
    return (
      <View style={[s.smoment, s.center]}>
        <T v="bodyS" c={color.white}>
          Opslaget findes ikke længere.
        </T>
        <View style={[s.smTop, { paddingTop: insets.top + 8 }]}>
          <CanvasButton label="Luk" onPress={close}>
            <Icon name="close" size={22} color={color.white} />
          </CanvasButton>
        </View>
      </View>
    );
  }

  return (
    <View style={s.smoment} accessibilityLabel="Del som moment">
      <StatusBar style="light" />
      {post && (
        <MomentCanvas
          layout={layout}
          post={post}
          hideText={editing?.id}
          edit={{
            setLayout,
            onTapPost: nextStyle,
            onTapText: editText,
            onDragText: (on, over) => setDrag((d) => (d.on === on && d.over === over ? d : { on, over })),
            onDropText: (id, over) => {
              setDrag({ on: false, over: false });
              if (over) setLayout((l) => ({ ...l, texts: l.texts.filter((t) => t.id !== id) }));
            },
            onGuides: (g) => setGuides((o) => (o.v === g.v && o.h === g.h ? o : g)),
          }}
        />
      )}
      <Guides {...guides} />
      {drag.on && <TrashTarget active={drag.over} />}

      {/* Øverst: luk, baggrund og tekst */}
      {!editing && !drag.on && (
        <View style={[s.smTop, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <CanvasButton label="Luk" onPress={close}>
            <Icon name="close" size={22} color={color.white} />
          </CanvasButton>
          <View style={{ flex: 1 }} pointerEvents="none" />
          <CanvasButton label="Skift baggrund" onPress={nextBg}>
            <BackdropSwatch bg={layout.bg} image={image} />
          </CanvasButton>
          <CanvasButton label="Skriv tekst" onPress={startText}>
            <T style={s.aa}>Aa</T>
          </CanvasButton>
        </View>
      )}

      {/* Udseendets navn, når man trykker på opslaget */}
      {!!toast && (
        <View style={s.toastWrap} pointerEvents="none">
          <View style={s.toast}>
            <T v="captionStrong" c={color.white}>
              {toast}
            </T>
          </View>
        </View>
      )}

      {!editing && !drag.on && (
        <View style={[s.smBottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="smFade" x1="0" y1="1" x2="0" y2="0">
                  <Stop offset="0" stopColor="#000" stopOpacity={0.4} />
                  <Stop offset="1" stopColor="#000" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#smFade)" />
            </Svg>
          </View>
          {hint && (
            <View style={s.hint} pointerEvents="none">
              <T v="caption" c={color.white} style={{ textAlign: 'center' }}>
                Tryk på opslaget for at skifte udseende. Træk for at flytte, knib for at ændre størrelse.
              </T>
            </View>
          )}
          {!!error && (
            <T v="bodyS" c={color.white}>
              {error}
            </T>
          )}
          <Button variant="highlight" block loading={busy} disabled={!post} onPress={() => share(null, postId, layout)}>
            Del moment
          </Button>
        </View>
      )}

      {editing && <TextEditor value={editing} onChange={(v) => setEditing((e) => (e ? { ...e, ...v } : e))} onDone={doneText} />}
    </View>
  );
}

/** Skriv eller ret en tekst: stor tekst midt på, farver og "boks" øverst */
function TextEditor({ value, onChange, onDone }: { value: { text: string; color: string; box: boolean }; onChange: (v: Partial<{ text: string; color: string; box: boolean }>) => void; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = Math.min(width, 600) / 390;
  const size = 28 * k;
  const fg = value.box ? onBox(value.color) : value.color;
  const textStyle = { fontFamily: font.title, fontSize: size, lineHeight: size * 1.18, textAlign: 'center' as const };
  return (
    <View style={s.editor}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityLabel="Færdig" />
      <View style={[s.edTop, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <CanvasButton label={value.box ? 'Uden baggrund' : 'Med baggrund'} on={value.box} onPress={() => onChange({ box: !value.box })}>
          <T style={[s.aa, value.box && { color: color.ink900 }]}>A</T>
        </CanvasButton>
        <View style={s.colors}>
          {textColors.map((c) => (
            <Pressable key={c} accessibilityRole="button" accessibilityLabel="Farve" accessibilityState={{ selected: value.color === c }} onPress={() => onChange({ color: c })} hitSlop={4}>
              <View style={[s.dot, { backgroundColor: c }, value.color === c && s.dotOn]} />
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8} style={s.done}>
          <T v="label" c={color.ink900}>
            Færdig
          </T>
        </Pressable>
      </View>
      <View style={s.edMid} pointerEvents="box-none">
        {/*
          Boksen får sin størrelse fra den synlige tekst, så den vokser roligt, mens man skriver.
          Selve skrivefeltet ligger usynligt ovenpå (kun markøren ses), så intet hopper eller blinker.
        */}
        <View style={[{ maxWidth: 330 * k, minWidth: 40 * k, paddingHorizontal: 12 * k, paddingVertical: 6 * k, borderRadius: 12 * k }, value.box && { backgroundColor: value.color }]}>
          <T style={[textStyle, { color: value.text ? fg : value.box ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)' }]}>{value.text ? value.text + (value.text.endsWith('\n') ? ' ' : '') : 'Skriv noget'}</T>
          <TextInput
            autoFocus
            multiline
            maxLength={200}
            value={value.text}
            onChangeText={(text) => onChange({ text })}
            accessibilityLabel="Tekst på momentet"
            selectionColor={fg}
            cursorColor={fg}
            scrollEnabled={false}
            style={[
              noOutline,
              textStyle,
              s.input,
              { left: 12 * k, right: 12 * k, top: 6 * k, bottom: 6 * k, color: 'transparent', caretColor: fg, overflow: 'hidden', resize: 'none' } as object,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 10 },
  /* Del som moment */
  smoment: { flex: 1, backgroundColor: color.ink900, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  smTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  smBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10, paddingTop: 24, paddingHorizontal: 16 },
  aa: { fontFamily: font.title, fontSize: 18, lineHeight: 22, color: color.white },
  hint: { alignSelf: 'center', maxWidth: 320, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  toastWrap: { position: 'absolute', top: '18%', left: 0, right: 0, alignItems: 'center' },
  toast: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  editor: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  edTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  colors: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  dotOn: { transform: [{ scale: 1.25 }], borderColor: color.white, borderWidth: 3 },
  done: { minHeight: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.white },
  input: { position: 'absolute', padding: 0, margin: 0, borderWidth: 0, backgroundColor: 'transparent' },
  edMid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: '30%' },
});
