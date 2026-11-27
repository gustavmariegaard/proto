import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { imageSource } from '@/lib/media';
import { myMoments, saveHighlight, type MomentCard } from '@/lib/moments';
import { useMe } from '@/lib/session';
import { color, font } from '@/theme/tokens';

const DAYS = ['Søn.', 'Man.', 'Tirs.', 'Ons.', 'Tors.', 'Fre.', 'Lør.'];

/** "For 2 timer siden", "I går", "Man." – som i prototypens arkiv */
function momentTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const hours = Math.floor((now.getTime() - d.getTime()) / 3600e3);
  const dayDiff = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400e3);
  if (dayDiff === 0) return hours < 1 ? 'Lige nu' : `For ${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
  if (dayDiff === 1) return 'I går';
  if (dayDiff < 7) return DAYS[d.getDay()]!;
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

/**
 * Ny highlight (prototypens NewHighlight): giv den et navn, og vælg moments fra dit arkiv.
 * Det første valgte bliver forside.
 */
export default function NewHighlight() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [all, setAll] = useState<MomentCard[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gridW, setGridW] = useState(0);
  // Tre lige brede kolonner med 4 px imellem
  const cellW = gridW ? Math.floor(((gridW - 8) / 3) * 100) / 100 : 0;
  const canCreate = title.trim().length > 0 && picked.length > 0;

  useEffect(() => {
    myMoments(me.id).then(setAll);
  }, [me.id]);

  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      await saveHighlight(me.id, title.trim(), picked);
      router.replace('/profil');
    } catch {
      setError('Highlighten kunne ikke oprettes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <PageHeader title="Ny highlight" fallback="/profil">
        <Button variant="ghost" disabled={!canCreate || busy} onPress={create}>
          Opret
        </Button>
      </PageHeader>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={s.name}>
          <T v="label">Navn</T>
          <TextField label="Navn" showLabel={false} placeholder="Fx Sommer eller Rejser" value={title} maxLength={24} onChangeText={setTitle} autoFocus />
        </View>

        <View style={s.head}>
          <T v="headingS">Vælg fra dine moments</T>
          <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
            {picked.length ? `${picked.length} valgt · det første er forside` : 'Tryk for at vælge'}
          </T>
        </View>

        {all?.length === 0 && (
          <T v="bodyS" c={color.textSecondary}>
            Du har ingen moments endnu.
          </T>
        )}

        <View style={s.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
          {(all ?? []).map((m) => {
            const n = picked.indexOf(m.id);
            const on = n >= 0;
            const time = momentTime(m.created_at);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Moment ${time}${on ? `, valgt som nummer ${n + 1}` : ''}`}
                onPress={() => toggle(m.id)}
                style={cellW ? { width: cellW } : s.cell}
              >
                <View style={s.tile}>
                  {m.media_path && m.media_type === 'image' ? (
                    <Image source={imageSource(m.media_path)} style={[StyleSheet.absoluteFill, on && { opacity: 0.75 }]} contentFit="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, s.textTile, m.media_type === 'video' && m.media_path ? s.videoTile : null, on && { opacity: 0.75 }]}>
                      {m.media_type === 'video' && m.media_path ? (
                        <Icon name="clip" color={color.white} />
                      ) : (
                        <T v="caption" numberOfLines={5} style={{ textAlign: 'center' }}>
                          {m.text || 'Delt opslag'}
                        </T>
                      )}
                    </View>
                  )}
                  {on && <View style={s.onRing} />}
                  <T v="caption" c={color.white} style={s.time} numberOfLines={1}>
                    {time}
                  </T>
                  <View style={[s.check, on && s.checkOn]}>
                    {on ? <T style={s.checkNum}>{n + 1}</T> : <Icon name="plus" size={14} color={color.white} />}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {!!error && (
          <T v="bodyS" c={color.danger}>
            {error}
          </T>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 16, paddingTop: 4, paddingHorizontal: 20 },
  name: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  // Moments i 9:16 som i et story-arkiv, tre kolonner med 4 px imellem
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '32%' },
  tile: { aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: 10, backgroundColor: color.bgSubtle },
  textTile: { alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: color.green200 },
  videoTile: { backgroundColor: color.ink900 },
  onRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, borderWidth: 3, borderColor: color.accentHighlight },
  time: { position: 'absolute', left: 6, bottom: 6, right: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.white,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { borderColor: color.accentHighlight, backgroundColor: color.accentHighlight },
  checkNum: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 14, color: color.ink900 },
});
