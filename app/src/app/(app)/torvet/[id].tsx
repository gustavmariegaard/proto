import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon, type IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MenuItem } from '@/components/MenuItem';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { imageSource } from '@/lib/media';
import { fmtKm, formatPrice, getListing, getMyLocation, kmBetween, listedText, markViewed, messageSeller, setListingSaved, type ListingRow } from '@/lib/market';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius, TAP } from '@/theme/tokens';

type Full = ListingRow & { lat: number; lng: number; seller_since: string };
const reportReasons = ['Svindel eller snyd', 'Forbudt vare', 'Vildledende annonce', 'Allerede solgt', 'Andet'];

/** Annonce på Torvet. Rute: /torvet/[id] */
export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [l, setL] = useState<Full | null | undefined>(undefined);
  const [distance, setDistance] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [sheet, setSheet] = useState<null | 'mere' | 'bud' | 'pris' | 'slet' | 'rapporter' | 'solgt'>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const data = (await getListing(id, me.id)) as Full | null;
    setL(data);
    if (data) {
      setSaved(data.saved);
      if (data.seller_id !== me.id) {
        markViewed(data.id, me.id);
        const loc = await getMyLocation(me.id);
        if (loc) setDistance(kmBetween(loc.lat, loc.lng, data.lat, data.lng));
      }
    }
  }, [id, me.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 2200);
    return () => clearTimeout(t);
  }, [note]);

  if (l === undefined) {
    return (
      <Screen title="Torvet">
        <ActivityIndicator color={color.textPrimary} />
      </Screen>
    );
  }
  if (!l || (l.sold && l.seller_id !== me.id)) {
    return (
      <Screen title="Torvet">
        <T v="bodyS" c={color.textSecondary}>
          Annoncen findes ikke længere.
        </T>
        <Button title="Tilbage til Torvet" variant="secondary" onPress={() => router.replace('/torvet')} />
      </Screen>
    );
  }

  const mine = l.seller_id === me.id;

  const write = async (text?: string) => {
    setBusy(true);
    try {
      const conv = await messageSeller(l, me.id, text);
      router.push(`/samtale/${conv}`);
    } catch {
      setNote('Beskeden kunne ikke sendes');
    }
    setBusy(false);
  };

  const share = () => Share.share({ message: `${l.title} – ${formatPrice(l.price)} på Torvet` });

  const toggleSave = () => {
    setSaved(!saved);
    setListingSaved(l.id, me.id, !saved);
  };

  const facts: [string, string][] = [
    ['Stand', l.condition],
    ['Afhentning', l.city],
    ['Forsendelse', l.shipping ? 'Kan sendes' : 'Kun afhentning'],
  ];

  return (
    <Screen
      title="Torvet"
      right={
        <>
          <IconButton icon="send" label="Del annonce" onPress={share} />
          <IconButton icon="dots" label="Flere muligheder" onPress={() => setSheet('mere')} />
        </>
      }
      contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
    >
      <Gallery paths={l.image_paths} title={l.title} />

      <View style={s.body}>
        <View style={{ gap: 4 }}>
          <T v="titleL">{l.title}</T>
          <T v="titleL">{formatPrice(l.price)}</T>
          <T v="caption" c={color.textSecondary}>
            {mine ? l.city : `${distance !== null ? fmtKm(distance) + ' · ' : ''}${l.city}`} · Sat til salg {listedText(l.created_at).toLowerCase()}
          </T>
        </View>

        {mine ? (
          <View style={{ gap: 10 }}>
            <Button title="Marker som solgt" icon="check" block onPress={() => setSheet('solgt')} />
            <View style={s.row2}>
              <Button title="Rediger pris" variant="secondary" style={{ flex: 1 }} onPress={() => setSheet('pris')} />
              <Button title="Slet" variant="secondary" style={{ flex: 1 }} onPress={() => setSheet('slet')} />
            </View>
          </View>
        ) : (
          <>
            <View style={s.actions}>
              <Action icon="bookmark" label={saved ? 'Gemt' : 'Gem'} on={saved} onPress={toggleSave} />
              <Action icon="send" label="Del" onPress={share} />
              <Action icon="shop" label="Giv et bud" onPress={() => setSheet('bud')} />
            </View>
            <Button title="Skriv til sælger" icon="chat" block loading={busy} onPress={() => write()} />
          </>
        )}

        <View style={s.facts}>
          {facts.map(([k, v]) => (
            <View key={k} style={s.fact}>
              <T v="bodyS" c={color.textSecondary}>
                {k}
              </T>
              <T v="label">{v}</T>
            </View>
          ))}
        </View>

        {!!l.description && <T v="body">{l.description}</T>}

        {!mine && (
          <Pressable accessibilityRole="link" onPress={() => router.push(`/bruger/${l.seller_username}`)} style={s.seller}>
            <Avatar name={l.seller_name} path={l.seller_avatar_path} />
            <View style={{ flex: 1 }}>
              <T v="headingS">{l.seller_name}</T>
              <T v="caption" c={color.textSecondary}>
                På ciircle siden {new Date(l.seller_since).getFullYear()}
              </T>
            </View>
            <Icon name="chevron-right" size={18} />
          </Pressable>
        )}
      </View>

      {!!note && (
        <View style={s.toast} accessibilityLiveRegion="polite">
          <T v="captionStrong" c={color.white}>
            {note}
          </T>
        </View>
      )}

      <Sheet open={sheet === 'mere'} onClose={() => setSheet(null)} title="Annonce">
        {mine ? (
          <MenuItem icon="close" label="Slet annonce" danger onPress={() => setSheet('slet')} />
        ) : (
          <MenuItem icon="flag" label="Rapportér annonce" danger onPress={() => setSheet('rapporter')} />
        )}
      </Sheet>

      <PriceSheet
        open={sheet === 'bud'}
        onClose={() => setSheet(null)}
        title="Giv et bud"
        initial=""
        submit="Send bud"
        onSubmit={async (kr) => {
          setSheet(null);
          await write(`Bud: ${formatPrice(kr)} for ${l.title}`);
        }}
      />
      <PriceSheet
        open={sheet === 'pris'}
        onClose={() => setSheet(null)}
        title="Rediger pris"
        initial={String(l.price)}
        submit="Gem pris"
        allowZero
        onSubmit={async (kr) => {
          setSheet(null);
          await supabase.from('listings').update({ price: kr }).eq('id', l.id);
          setL({ ...l, price: kr });
          setNote('Prisen er opdateret');
        }}
      />

      <Sheet open={sheet === 'solgt'} onClose={() => setSheet(null)} title="Marker som solgt?">
        <View style={s.sheetBody}>
          <T v="bodyS" c={color.textSecondary}>
            Annoncen fjernes fra Torvet.
          </T>
          <Button
            title="Marker som solgt"
            block
            onPress={async () => {
              await supabase.from('listings').update({ sold: true }).eq('id', l.id);
              setSheet(null);
              router.replace('/torvet?vis=dine');
            }}
          />
          <Button title="Annuller" variant="secondary" block onPress={() => setSheet(null)} />
        </View>
      </Sheet>

      <Sheet open={sheet === 'slet'} onClose={() => setSheet(null)} title="Slet annonce?">
        <View style={s.sheetBody}>
          <Button
            title="Slet annonce"
            block
            onPress={async () => {
              await supabase.from('listings').delete().eq('id', l.id);
              setSheet(null);
              router.replace('/torvet?vis=dine');
            }}
          />
          <Button title="Annuller" variant="secondary" block onPress={() => setSheet(null)} />
        </View>
      </Sheet>

      <ReportSheet
        open={sheet === 'rapporter'}
        onClose={() => setSheet(null)}
        onSend={async (reason) => {
          await supabase.from('reports').insert({ reporter_id: me.id, listing_id: l.id, reason: 'andet', details: reason });
        }}
      />
    </Screen>
  );
}

/** Billeder, man kan swipe igennem, med prikker og tæller */
function Gallery({ paths, title }: { paths: string[]; title: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 600);
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const count = paths.length;
  const go = (i: number) => ref.current?.scrollTo({ x: i * w, animated: true });
  return (
    <View style={{ width: w, height: w, backgroundColor: color.bgSubtle }} accessibilityLabel={`Billeder af ${title}`}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / w))}
        scrollEventThrottle={32}
      >
        {paths.map((p, i) => (
          <Image key={p} source={imageSource(p)} style={{ width: w, height: w }} contentFit="cover" accessibilityLabel={`Billede ${i + 1} af ${count}`} />
        ))}
      </ScrollView>
      {count > 1 && (
        <>
          <View style={g.counter}>
            <T v="captionStrong" c={color.white}>
              {index + 1}/{count}
            </T>
          </View>
          <View style={g.dots}>
            {paths.map((_, i) => (
              <View key={i} style={[g.dot, i === index && g.dotOn]} />
            ))}
          </View>
          {index > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Forrige billede" onPress={() => go(index - 1)} style={[g.nav, { left: 10 }]}>
              <Icon name="chevron-left" size={20} />
            </Pressable>
          )}
          {index < count - 1 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Næste billede" onPress={() => go(index + 1)} style={[g.nav, { right: 10 }]}>
              <Icon name="chevron-right" size={20} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function Action({ icon, label, on, onPress }: { icon: IconName; label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={on !== undefined ? { selected: on } : undefined} onPress={onPress} style={s.action}>
      <View style={[s.actionIcon, on && { backgroundColor: color.actionPrimary }]}>
        <Icon name={icon} size={22} color={on ? color.white : color.textPrimary} filled={on} />
      </View>
      <T v="captionStrong">{label}</T>
    </Pressable>
  );
}

function PriceSheet({
  open,
  onClose,
  title,
  initial,
  submit,
  allowZero,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: string;
  submit: string;
  allowZero?: boolean;
  onSubmit: (kr: number) => void;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    if (open) setV(initial);
  }, [open, initial]);
  const kr = Number(v.replace(/\D/g, '') || 'NaN');
  const ok = Number.isFinite(kr) && (allowZero ? kr >= 0 : kr > 0);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={s.sheetBody}>
        <View style={s.priceField}>
          <TextInput
            accessibilityLabel="Beløb i kroner"
            keyboardType="number-pad"
            value={v}
            onChangeText={(t) => setV(t.replace(/\D/g, ''))}
            placeholder="0"
            placeholderTextColor={color.textSecondary}
            style={s.priceInput}
            autoFocus
          />
          <T v="label" c={color.textSecondary}>
            kr.
          </T>
        </View>
        <Button title={submit} block disabled={!ok} onPress={() => onSubmit(kr)} />
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
    <Sheet open={open} onClose={onClose} title={sent ? 'Tak for din rapport' : 'Rapportér annonce'}>
      <View style={s.sheetBody}>
        {sent ? (
          <>
            <T v="bodyS" c={color.textSecondary}>
              Vi kigger på annoncen. Din rapport er anonym.
            </T>
            <Button title="Færdig" block onPress={onClose} />
          </>
        ) : (
          <>
            <View style={s.reasons}>
              {reportReasons.map((r) => (
                <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
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
  counter: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { backgroundColor: color.white },
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
  },
});

const s = StyleSheet.create({
  body: { paddingHorizontal: 20, gap: 18, paddingTop: 16 },
  row2: { flexDirection: 'row', gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  action: { alignItems: 'center', gap: 6, minWidth: 80, minHeight: TAP },
  actionIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: color.borderDefault, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bgSurface },
  facts: { borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  fact: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: color.bgSubtle, minHeight: TAP },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  sheetBody: { padding: 20, gap: 12 },
  priceField: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.pill, paddingHorizontal: 18, minHeight: 56 },
  priceInput: { flex: 1, minHeight: 52, fontFamily: font.bodySemi, fontSize: 22, color: color.textPrimary },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
