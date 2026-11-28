import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { MediaViewer } from '@/components/MediaViewer';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { imageSource } from '@/lib/media';
import { fmtKm, formatPrice, getListing, kmBetween, knownLocation, listedText, markViewed, messageSeller, setListingSaved, type ListingRow } from '@/lib/market';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius, TAP } from '@/theme/tokens';

type Full = ListingRow & { lat: number; lng: number; seller_since: string };
const reportReasons = ['Svindel eller snyd', 'Forbudt vare', 'Vildledende annonce', 'Allerede solgt', 'Andet'];

/** Annonce på Torvet (fuld skærm, prototypens ListingDetail). Rute: /torvet/[id] */
export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [l, setL] = useState<Full | null | undefined>(undefined);
  const [distance, setDistance] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [sheet, setSheet] = useState<null | 'mere' | 'bud' | 'pris' | 'slet' | 'rapporter'>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const data = (await getListing(id, me.id)) as Full | null;
    setL(data);
    if (data) {
      setSaved(data.saved);
      if (data.seller_id !== me.id) {
        markViewed(data.id, me.id);
        // Afstand fra der, hvor du er nu (vises ikke, hvis vi ikke kender din placering)
        const loc = await knownLocation(me.id);
        setDistance(loc ? kmBetween(loc.lat, loc.lng, data.lat, data.lng) : null);
      }
    }
  }, [id, me.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  if (l === undefined) return <View style={s.screen}><PageHeader title="Torvet" fallback="/torvet" /></View>;
  if (!l || (l.sold && l.seller_id !== me.id)) {
    return (
      <View style={s.screen}>
        <PageHeader title="Torvet" fallback="/torvet" />
        <View style={s.padded}>
          <T v="bodyS" c={color.textSecondary}>
            Annoncen findes ikke længere.
          </T>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/torvet')} style={s.link}>
            <T v="label" style={{ textDecorationLine: 'underline' }}>
              Tilbage til Torvet
            </T>
          </Pressable>
        </View>
      </View>
    );
  }

  const mine = l.seller_id === me.id;
  const close = () => setSheet(null);

  const write = async (text?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const conv = await messageSeller(l, me.id, text);
      router.push(`/samtale/${conv}`);
    } catch {
      setToast('Beskeden kunne ikke sendes');
    }
    setBusy(false);
  };

  const share = async () => {
    const url = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/torvet/${l.id}` : Linking.createURL(`/torvet/${l.id}`);
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as Navigator & { share?: (d: object) => Promise<void> };
        if (nav.share) {
          await nav.share({ title: l.title, text: `${l.title} – ${formatPrice(l.price)} på Torvet`, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        setToast('Linket er kopieret');
      } else {
        await Share.share({ message: `${l.title} – ${formatPrice(l.price)} på Torvet ${url}` });
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setToast('Linket kunne ikke deles');
    }
  };

  const toggleSave = () => {
    setSaved(!saved);
    setListingSaved(l.id, me.id, !saved);
    setToast(saved ? 'Fjernet fra Gemte' : 'Gemt – find den under Gemte');
  };

  const facts: [string, string][] = [
    ['Stand', l.condition],
    ['Afhentning', l.city],
    ['Forsendelse', l.shipping ? 'Kan sendes' : 'Kun afhentning'],
  ];
  const since = new Date(l.seller_since ?? l.created_at).getFullYear();

  return (
    <View style={s.screen}>
      <PageHeader title="Torvet" fallback="/torvet">
        <IconButton icon="send" label="Del annonce" onPress={share} />
        <IconButton icon="dots" label="Flere muligheder" onPress={() => setSheet('mere')} />
      </PageHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        <Gallery paths={l.image_paths} title={l.title} />

        <View style={s.body}>
          <View style={s.head}>
            <T v="titleL" accessibilityRole="header">
              {l.title}
            </T>
            <T v="titleL">{formatPrice(l.price)}</T>
            <T v="caption" c={color.textSecondary}>
              {mine ? l.city : `${distance !== null ? fmtKm(distance) + ' · ' : ''}${l.city}`} · Sat til salg {listedText(l.created_at).toLowerCase()}
            </T>
          </View>

          {mine ? (
            <View style={s.owner} accessibilityLabel="Din annonce">
              <Button
                title="Marker som solgt"
                icon="check"
                block
                onPress={async () => {
                  // Solgt = fjernet fra Torvet
                  await supabase.from('listings').update({ sold: true }).eq('id', l.id);
                  router.replace('/torvet?vis=dine');
                }}
              />
              <View style={s.ownerRow}>
                <Button title="Rediger pris" icon="edit" variant="secondary" style={{ flex: 1, minWidth: 0 }} onPress={() => setSheet('pris')} />
                <Button title="Slet" icon="close" variant="secondary" style={{ flex: 1, minWidth: 0 }} onPress={() => setSheet('slet')} />
              </View>
            </View>
          ) : (
            <>
              <View style={s.actions}>
                <Action icon="bookmark" label={saved ? 'Gemt' : 'Gem'} on={saved} onPress={toggleSave} />
                <Action icon="send" label="Del" onPress={share} />
                <Action icon="shop" label="Giv et bud" onPress={() => setSheet('bud')} />
              </View>
              <Button title={`Skriv til ${l.seller_name.split(' ')[0]}`} icon="chat" block loading={busy} onPress={() => write()} />
            </>
          )}

          <View style={s.section}>
            <T v="headingM" accessibilityRole="header">
              Detaljer
            </T>
            <View>
              {facts.map(([k, v], i) => (
                <View key={k} style={[s.fact, i > 0 && s.factLine]}>
                  <T v="bodyS" c={color.textSecondary}>
                    {k}
                  </T>
                  <T v="label" style={{ textAlign: 'right', flexShrink: 1 }}>
                    {v}
                  </T>
                </View>
              ))}
            </View>
            {!!l.description && <T v="body">{l.description}</T>}
          </View>

          <View style={s.section}>
            <T v="headingM" accessibilityRole="header">
              Om sælgeren
            </T>
            {mine ? (
              <View style={s.seller}>
                <Avatar name={me.name} path={me.avatar_path} />
                <View style={s.sellerText}>
                  <T v="headingS">{me.name} (dig)</T>
                  <T v="caption" c={color.textSecondary}>
                    Sælger på Torvet siden {since}
                  </T>
                </View>
              </View>
            ) : (
              <Pressable accessibilityRole="link" onPress={() => router.push(`/bruger/${l.seller_username}`)} style={s.seller}>
                <Avatar name={l.seller_name} path={l.seller_avatar_path} />
                <View style={s.sellerText}>
                  <T v="headingS">{l.seller_name}</T>
                  <T v="caption" c={color.textSecondary}>
                    Sælger på Torvet siden {since}
                  </T>
                </View>
                <View style={s.more}>
                  <T v="captionStrong" c={color.textSecondary}>
                    Se profil
                  </T>
                  <Icon name="chevron-right" size={18} color={color.textSecondary} />
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {!!toast && (
        <View style={[s.toast, { bottom: 24 + insets.bottom }]} accessibilityLiveRegion="polite">
          <T v="captionStrong" c={color.textOnAction} numberOfLines={1}>
            {toast}
          </T>
        </View>
      )}

      <PriceSheet
        open={sheet === 'bud'}
        onClose={close}
        title="Giv et bud"
        hint={`Sælgeren beder om ${formatPrice(l.price).replace(/\.$/, '')}. Dit bud sendes som en besked til sælgeren.`}
        initial=""
        submit="Send bud"
        onSubmit={async (kr) => {
          close();
          await write(`Jeg byder ${formatPrice(kr)}`);
        }}
      />
      <PriceSheet
        open={sheet === 'pris'}
        onClose={close}
        title="Rediger pris"
        hint="Den nye pris vises med det samme i annoncen."
        initial={String(l.price)}
        submit="Gem pris"
        onSubmit={async (kr) => {
          close();
          await supabase.from('listings').update({ price: kr }).eq('id', l.id);
          setL({ ...l, price: kr });
          setToast('Prisen er opdateret');
        }}
      />

      <Sheet open={sheet === 'slet'} onClose={close} title="Slet annoncen?" initialSize="auto" dim>
        <View style={s.sheet}>
          <T v="bodyS" c={color.textSecondary}>
            Annoncen forsvinder fra Torvet. Det kan ikke fortrydes.
          </T>
          <Button
            title="Slet annonce"
            block
            onPress={async () => {
              await supabase.from('listings').delete().eq('id', l.id);
              close();
              router.replace('/torvet?vis=dine');
            }}
          />
          <Button title="Annuller" variant="secondary" block onPress={close} />
        </View>
      </Sheet>

      <Sheet open={sheet === 'mere'} onClose={close} title="Annonce" initialSize="auto" dim>
        <View style={s.menu}>
          {!mine && (
            <MenuRow
              icon="bookmark"
              label={saved ? 'Fjern fra Gemte' : 'Gem annonce'}
              onPress={() => {
                close();
                toggleSave();
              }}
            />
          )}
          <MenuRow
            icon="link"
            label="Del eller kopiér link"
            onPress={() => {
              close();
              share();
            }}
          />
          {!mine && <MenuRow icon="flag" label="Rapportér annonce" onPress={() => setSheet('rapporter')} />}
        </View>
      </Sheet>

      <ReportSheet
        open={sheet === 'rapporter'}
        onClose={close}
        onSend={async (reason) => {
          await supabase.from('reports').insert({ reporter_id: me.id, listing_id: l.id, reason: 'andet', details: reason });
        }}
      />
    </View>
  );
}

/** Har browseren en mus? (prototypen: @media (hover: hover) and (pointer: fine)) */
const fineMouse = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** Billeder, man kan swipe igennem, med prikker og tæller */
function Gallery({ paths, title }: { paths: string[]; title: string }) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 600);
  const h = Math.min(w, height * 0.52);
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  // Tryk på et billede: vis billederne i fuld skærm, startende ved det, man trykkede på
  const [full, setFull] = useState<number | null>(null);
  const count = paths.length;
  const go = (i: number) => ref.current?.scrollTo({ x: i * w, animated: true });
  return (
    <View style={{ width: w, height: h, backgroundColor: color.bgSubtle }} accessibilityLabel={`Billeder af ${title}`}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setIndex(Math.min(count - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / w))))}
        scrollEventThrottle={32}
      >
        {paths.map((p, i) => (
          <Pressable
            key={`${i}-${p}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Billede ${i + 1} af ${count}. Vis i fuld skærm`}
            onPress={() => setFull(i)}
            style={({ pressed }) => [{ width: w, height: h }, pressed && { opacity: 0.92 }]}
          >
            <Image source={imageSource(p)} style={{ width: w, height: h }} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={full !== null} transparent animationType="none" statusBarTranslucent onRequestClose={() => setFull(null)}>
        {full !== null && (
          <MediaViewer
            paths={paths}
            startAt={full}
            label={title}
            onClose={() => {
              // Galleriet på annoncen følger med til det billede, man lukkede på
              setFull(null);
            }}
          />
        )}
      </Modal>
      {count > 1 && (
        <>
          <View style={g.counter} accessibilityLiveRegion="polite">
            <T v="captionStrong" c={color.white}>
              {index + 1}/{count}
            </T>
          </View>
          <View style={g.dotsWrap} pointerEvents="none">
            <View style={g.dots}>
              {paths.map((_, i) => (
                <View key={i} style={[g.dot, i === index && g.dotOn]} />
              ))}
            </View>
          </View>
          {/* Pile kun med mus; på telefonen swiper man */}
          {fineMouse && index > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Forrige billede" onPress={() => go(index - 1)} style={[g.nav, { left: 10 }]}>
              <Icon name="chevron-left" size={20} />
            </Pressable>
          )}
          {fineMouse && index < count - 1 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Næste billede" onPress={() => go(index + 1)} style={[g.nav, { right: 10 }]}>
              <Icon name="chevron-right" size={20} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

/** Rund knap med tekst under (Gem, Del, Giv et bud) */
function Action({ icon, label, on, onPress }: { icon: IconName; label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={on !== undefined ? { selected: on } : undefined} onPress={onPress} style={s.action}>
      {({ pressed }) => (
        <>
          <View style={[s.actionIcon, on && { backgroundColor: color.accentHighlight }, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Icon name={icon} size={22} filled={on} />
          </View>
          <T v="captionStrong">{label}</T>
        </>
      )}
    </Pressable>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: color.bgSubtle }]}>
      <Icon name={icon} />
      <T v="label">{label}</T>
    </Pressable>
  );
}

/** Ark med et prisfelt (Giv et bud / Rediger pris) */
function PriceSheet({
  open,
  onClose,
  title,
  hint,
  initial,
  submit,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  initial: string;
  submit: string;
  onSubmit: (kr: number) => void;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    if (open) setV(initial);
  }, [open, initial]);
  const kr = Number(v.replace(/\D/g, '') || '0');
  return (
    <Sheet open={open} onClose={onClose} title={title} initialSize="auto" dim>
      <View style={s.sheet}>
        <T v="bodyS" c={color.textSecondary}>
          {hint}
        </T>
        <View>
          <TextField
            label="Beløb i kroner"
            showLabel={false}
            keyboardType="number-pad"
            value={v}
            onChangeText={(t) => setV(t.replace(/\D/g, ''))}
            autoFocus
            onSubmitEditing={() => kr > 0 && onSubmit(kr)}
            style={{ paddingRight: 48 }}
          />
          <View style={s.unit} pointerEvents="none">
            <T v="label" c={color.textSecondary}>
              kr.
            </T>
          </View>
        </View>
        <Button title={submit} block disabled={kr <= 0} onPress={() => onSubmit(kr)} />
      </View>
    </Sheet>
  );
}

function ReportSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (open) {
      setReason('');
      setSent(false);
    }
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Rapportér annonce" initialSize="auto" dim>
      <View style={s.sheet}>
        {sent ? (
          <>
            <T v="bodyS">Tak. Vi kigger på annoncen. Sælgeren får ikke at vide, at det er dig, der har rapporteret den.</T>
            <Button title="Færdig" block onPress={onClose} />
          </>
        ) : (
          <>
            <T v="bodyS" c={color.textSecondary}>
              Hvad er der galt med annoncen?
            </T>
            <View style={s.reasons} accessibilityRole="radiogroup" accessibilityLabel="Grund">
              {reportReasons.map((r) => (
                <Chip key={r} selected={reason === r} onPress={() => setReason(r)}>
                  {r}
                </Chip>
              ))}
            </View>
            <Button
              title="Send rapport"
              block
              disabled={!reason}
              onPress={async () => {
                await onSend(reason);
                setSent(true);
              }}
            />
          </>
        )}
      </View>
    </Sheet>
  );
}

const g = StyleSheet.create({
  counter: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  dotsWrap: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, paddingVertical: 5, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.35)' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { backgroundColor: color.white, transform: [{ scale: 1.15 }] },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: TAP,
    height: TAP,
    borderRadius: TAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  padded: { alignItems: 'flex-start', gap: 12, paddingTop: 4, paddingHorizontal: 20 },
  link: { minHeight: TAP, justifyContent: 'center' },
  body: { gap: 20, paddingTop: 16, paddingHorizontal: 20 },
  head: { gap: 4 },
  owner: { gap: 10 },
  ownerRow: { flexDirection: 'row', gap: 8 },
  actions: { flexDirection: 'row', gap: 4 },
  action: { flex: 1, alignItems: 'center', gap: 6, minHeight: TAP, paddingVertical: 4, borderRadius: radius.md },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bgSubtle },
  section: { gap: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: color.borderDefault },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  factLine: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: radius.md },
  sellerText: { flex: 1, minWidth: 0, gap: 2 },
  more: { flexDirection: 'row', alignItems: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', zIndex: 40, maxWidth: '90%', paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  sheet: { gap: 12, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 24 },
  unit: { position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  menu: { paddingHorizontal: 8, paddingBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 12, borderRadius: radius.md },
});
