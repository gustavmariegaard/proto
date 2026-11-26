import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { imageSource } from '@/lib/media';
import { deleteHighlight, highlightMoments, myMoments, saveHighlight, type MomentCard } from '@/lib/moments';
import { useMe } from '@/lib/session';
import { ago } from '@/lib/time';
import { color, radius } from '@/theme/tokens';

/** Ny highlight (eller ?id= for at redigere): navn og valg fra dine moments */
export default function HighlightEditor() {
  const me = useMe();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [all, setAll] = useState<MomentCard[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    myMoments(me.id).then(setAll);
    if (id)
      highlightMoments(id).then((h) => {
        if (!h) return;
        setTitle(h.title);
        setChosen(h.moments.map((m) => m.id));
      });
  }, [id, me.id]);

  const toggle = (mid: string) => setChosen((c) => (c.includes(mid) ? c.filter((x) => x !== mid) : [...c, mid]));
  const ok = title.trim().length > 0 && chosen.length > 0;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await saveHighlight(me.id, title.trim(), chosen, id);
      router.canGoBack() ? router.back() : router.replace('/profil');
    } catch {
      setError('Highlighten kunne ikke gemmes. Prøv igen.');
      setBusy(false);
    }
  };

  return (
    <Screen
      title={id ? 'Rediger highlight' : 'Ny highlight'}
      footer={
        <View style={s.footer}>
          <Button title="Gem" block disabled={!ok} loading={busy} onPress={save} />
        </View>
      }
    >
      <TextField label="Navn" placeholder="Fx Sommer eller Rejser" value={title} onChangeText={setTitle} maxLength={40} />
      <T v="headingS">Vælg fra dine moments</T>
      {all && all.length === 0 && (
        <T v="bodyS" c={color.textSecondary}>
          Du har ingen moments endnu.
        </T>
      )}
      <View style={s.grid}>
        {(all ?? []).map((m) => {
          const n = chosen.indexOf(m.id);
          return (
            <Pressable key={m.id} accessibilityRole="checkbox" accessibilityState={{ checked: n >= 0 }} accessibilityLabel={`Moment ${ago(m.created_at)}`} onPress={() => toggle(m.id)} style={s.cell}>
              {m.media_path && m.media_type === 'image' ? (
                <Image source={imageSource(m.media_path)} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, s.textCell]}>
                  {m.media_type === 'video' ? <Icon name="video" size={22} /> : <T v="caption" numberOfLines={4}>{m.text || 'Delt opslag'}</T>}
                </View>
              )}
              <View style={[s.badge, n >= 0 && s.badgeOn]}>{n >= 0 && <T v="micro" c={color.white}>{n + 1}</T>}</View>
            </Pressable>
          );
        })}
      </View>
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      {id &&
        (confirmDelete ? (
          <View style={s.confirm}>
            <T v="bodyS" style={{ flex: 1 }}>
              Slet highlighten?
            </T>
            <Button title="Annuller" variant="secondary" onPress={() => setConfirmDelete(false)} />
            <Button
              title="Slet"
              onPress={async () => {
                await deleteHighlight(id);
                router.canGoBack() ? router.back() : router.replace('/profil');
              }}
            />
          </View>
        ) : (
          <Button title="Slet highlight" variant="danger" onPress={() => setConfirmDelete(true)} />
        ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: '32.4%', aspectRatio: 9 / 14, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: color.bgSubtle },
  textCell: { padding: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: color.green200 },
  badge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.white, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: color.actionPrimary },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
});
