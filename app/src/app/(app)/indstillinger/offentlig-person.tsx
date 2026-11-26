import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { evidenceHints, publicCategories, publicCriteria } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { color, radius, TAP } from '@/theme/tokens';

type Application = { id: string; category: string; status: 'behandles' | 'godkendt' | 'afvist'; created_at: string };
type Proof = { link: string; file?: { uri: string; name: string; mime: string } };

const empty: Proof[] = [{ link: '' }, { link: '' }, { link: '' }];
const done = (p: Proof) => p.link.trim().length > 3 && !!p.file;

/** Ansøg om at blive registreret som offentlig person (globus ved navnet). Godkendes af ciircle. */
export default function PublicFigure() {
  const me = useMe();
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [proofs, setProofs] = useState<Proof[]>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [again, setAgain] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('public_figure_applications').select('id, category, status, created_at').eq('user_id', me.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setApp((data as Application | null) ?? null);
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const patch = (i: number, p: Partial<Proof>) => setProofs((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const attach = async (i: number) => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets?.[0];
    if (a) patch(i, { file: { uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf' } });
  };

  const count = proofs.filter(done).length;
  const ready = !!category && count === 3;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const paths: string[] = [];
      for (const [i, p] of proofs.entries()) {
        const ext = p.file!.mime.includes('pdf') ? 'pdf' : p.file!.mime.includes('png') ? 'png' : 'jpg';
        const path = `${me.id}/offentlig-person/${Date.now()}-bilag-${i + 1}.${ext}`;
        const body = await (await fetch(p.file!.uri)).arrayBuffer();
        const { error } = await supabase.storage.from('dokumenter').upload(path, body, { contentType: p.file!.mime });
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await supabase
        .from('public_figure_applications')
        .insert({ user_id: me.id, category, links: proofs.map((p) => p.link.trim()), attachment_paths: paths });
      if (error) throw error;
      setProofs(empty);
      setAgain(false);
      await load();
    } catch {
      setError('Ansøgningen kunne ikke sendes. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!app) return;
    await supabase.from('public_figure_applications').delete().eq('id', app.id);
    await load();
  };

  if (app === undefined) return <Screen title="Offentlig person">{null}</Screen>;

  // Status på en sendt ansøgning
  if (app && !(app.status === 'afvist' && again)) {
    const steps = ['Ansøgning sendt', 'Under behandling', 'Afgørelse'];
    const reached = app.status === 'behandles' ? 2 : 3;
    return (
      <Screen title="Offentlig person">
        <View style={s.panel}>
          <View style={[s.badge, app.status === 'godkendt' ? s.badgeOk : app.status === 'afvist' ? s.badgeNo : s.badgeWait]}>
            <T v="captionStrong">{app.status === 'godkendt' ? 'Godkendt' : app.status === 'afvist' ? 'Afvist' : 'Under behandling'}</T>
          </View>
          <T v="headingM">
            {app.status === 'godkendt'
              ? 'Du er registreret som offentlig person'
              : app.status === 'afvist'
                ? 'Ansøgningen blev ikke godkendt'
                : 'Vi gennemgår din ansøgning'}
          </T>
          <T v="bodyS" c={color.textSecondary}>
            {app.status === 'godkendt'
              ? 'Globussen vises ved dit navn.'
              : app.status === 'afvist'
                ? 'Du kan søge igen med nye bilag.'
                : 'Det tager normalt op til 14 dage.'}
          </T>
        </View>
        <View style={{ gap: 10 }}>
          {steps.map((label, i) => (
            <View key={label} style={s.step}>
              <View style={[s.dot, i < reached && s.dotOn]}>{i < reached && <Icon name="check" size={14} color={color.white} />}</View>
              <T v={i < reached ? 'label' : 'bodyS'} c={i < reached ? color.textPrimary : color.textSecondary}>
                {label}
              </T>
            </View>
          ))}
        </View>
        {app.status === 'behandles' && <Button title="Træk ansøgningen tilbage" variant="secondary" onPress={withdraw} />}
        {app.status === 'afvist' && <Button title="Søg igen" onPress={() => setAgain(true)} />}
      </Screen>
    );
  }

  return (
    <Screen title="Offentlig person">
      <View style={s.hero}>
        <View style={s.globe}>
          <Icon name="globe" size={22} color={color.green700} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="headingS">Globus ved dit navn</T>
          <T v="caption" c={color.textSecondary}>
            Kræver godkendelse. Vi gennemgår hver ansøgning manuelt.
          </T>
        </View>
      </View>

      <T v="headingM">Kriterier</T>
      <View style={{ gap: 8 }}>
        {publicCriteria.map((c) => (
          <View key={c} style={{ flexDirection: 'row', gap: 8 }}>
            <Icon name="check" size={16} />
            <T v="bodyS" style={{ flex: 1 }}>
              {c}
            </T>
          </View>
        ))}
      </View>

      <T v="headingM">Område</T>
      <View style={s.chips}>
        {publicCategories.map((c) => (
          <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="headingM">Dokumentation</T>
        <T v="captionStrong" c={color.textSecondary}>
          {count} af 3
        </T>
      </View>
      {proofs.map((p, i) => (
        <View key={i} style={[s.proof, done(p) && s.proofDone]}>
          <View style={s.proofTop}>
            <View style={[s.num, done(p) && s.dotOn]}>{done(p) ? <Icon name="check" size={14} color={color.white} /> : <T v="micro">{i + 1}</T>}</View>
            <T v="headingS">Bilag {i + 1}</T>
            <T v="caption" c={color.textSecondary}>
              Påkrævet
            </T>
          </View>
          <TextField
            label={`Link til bilag ${i + 1}`}
            showLabel={false}
            placeholder={evidenceHints[i]}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={p.link}
            onChangeText={(t) => patch(i, { link: t })}
          />
          {p.file ? (
            <View style={s.file}>
              <Icon name="check" size={16} />
              <T v="bodyS" numberOfLines={1} style={{ flex: 1 }}>
                {p.file.name}
              </T>
              <Pressable accessibilityRole="button" accessibilityLabel={`Fjern ${p.file.name}`} onPress={() => patch(i, { file: undefined })} style={s.remove}>
                <Icon name="close" size={16} />
              </Pressable>
            </View>
          ) : (
            <Button title="Vedhæft fil" variant="ghost" icon="plus" onPress={() => attach(i)} style={{ alignSelf: 'flex-start', paddingHorizontal: 4 }} />
          )}
        </View>
      ))}
      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button title="Send ansøgning" block disabled={!ready} loading={busy} onPress={submit} />
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: color.noteBg },
  globe: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.bgSurface, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  proof: { gap: 10, padding: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  proofDone: { borderColor: color.green700 },
  proofTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  remove: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  panel: { gap: 8, padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface, alignItems: 'flex-start' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  badgeWait: { backgroundColor: color.gray150 },
  badgeOk: { backgroundColor: color.accentBg },
  badgeNo: { backgroundColor: '#fde2dd' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
});
