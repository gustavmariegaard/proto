import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AccCard, AccPanel, AccScreen } from '@/components/AccountParts';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { evidenceHints, publicCategories, publicCriteria } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { color, font, radius, TAP } from '@/theme/tokens';

type Application = {
  id: string;
  category: string;
  status: 'behandles' | 'godkendt' | 'afvist';
  created_at: string;
  links: string[];
  attachment_paths: string[];
};
type Proof = { link: string; file?: { uri: string; name: string; mime: string } };

const empty: Proof[] = [{ link: '' }, { link: '' }, { link: '' }];
const done = (p: Proof) => p.link.trim().length > 3 && !!p.file;

/** Ansøg om at blive registreret som offentlig person (prototypens PublicFigureSettings) */
export default function PublicFigure() {
  const me = useMe();
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [again, setAgain] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('public_figure_applications')
      .select('id, category, status, created_at, links, attachment_paths')
      .eq('user_id', me.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setApp((data as Application | null) ?? null);
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <AccScreen title="Offentlig person">
      {app === undefined ? null : app && !(app.status === 'afvist' && again) ? (
        <StatusView
          app={app}
          onWithdraw={async () => {
            await supabase.from('public_figure_applications').delete().eq('id', app.id);
            await load();
          }}
          onAgain={() => setAgain(true)}
        />
      ) : (
        <ApplicationForm
          userId={me.id}
          onSent={async () => {
            setAgain(false);
            await load();
          }}
        />
      )}
    </AccScreen>
  );
}

function ApplicationForm({ userId, onSent }: { userId: string; onSent: () => void }) {
  const [category, setCategory] = useState('');
  const [proofs, setProofs] = useState<Proof[]>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const count = proofs.filter(done).length;
  const ready = !!category && count === 3;
  const patch = (i: number, p: Partial<Proof>) => setProofs((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const attach = async (i: number) => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets?.[0];
    if (a) patch(i, { file: { uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf' } });
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const paths: string[] = [];
      for (const [i, p] of proofs.entries()) {
        const ext = p.file!.mime.includes('pdf') ? 'pdf' : p.file!.mime.includes('png') ? 'png' : 'jpg';
        // Filnavnet gemmes i stien, så det kan vises bagefter
        const safe = p.file!.name.replace(/[^\wæøåÆØÅ.-]+/g, '-').slice(-60);
        const path = `${userId}/offentlig-person/${Date.now()}-${i + 1}-${safe || `bilag.${ext}`}`;
        const body = await (await fetch(p.file!.uri)).arrayBuffer();
        const { error } = await supabase.storage.from('dokumenter').upload(path, body, { contentType: p.file!.mime });
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await supabase
        .from('public_figure_applications')
        .insert({ user_id: userId, category, links: proofs.map((p) => p.link.trim()), attachment_paths: paths });
      if (error) throw error;
      setProofs(empty);
      onSent();
    } catch {
      setError('Ansøgningen kunne ikke sendes. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={s.hero}>
        <View style={s.globe}>
          <Icon name="globe" size={22} color={color.textOnAction} />
        </View>
        <View style={s.text}>
          <T v="headingS">Globus ved dit navn</T>
          <T v="caption" c={color.textSecondary}>
            Kræver godkendelse. Vi gennemgår hver ansøgning manuelt.
          </T>
        </View>
      </View>

      <T v="headingM" accessibilityRole="header">
        Kriterier
      </T>
      <View style={s.criteria}>
        {publicCriteria.map((c) => (
          <View key={c} style={s.criterion}>
            <View style={{ marginTop: 2 }}>
              <Icon name="check" size={16} />
            </View>
            <T v="bodyS" style={{ flex: 1 }}>
              {c}
            </T>
          </View>
        ))}
      </View>

      <T v="headingM" accessibilityRole="header">
        Område
      </T>
      <View style={s.chips} accessibilityLabel="Område">
        {publicCategories.map((c) => (
          <Chip key={c} selected={c === category} onPress={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </View>

      <View style={s.heading}>
        <T v="headingM" accessibilityRole="header">
          Dokumentation
        </T>
        <T v="captionStrong" c={color.textSecondary} accessibilityLiveRegion="polite">
          {count} af 3
        </T>
      </View>
      <View style={s.evidence}>
        {proofs.map((p, i) => (
          <AccPanel key={i} style={[s.proof, done(p) && { borderColor: color.borderStrong }]}>
            <View style={s.proofTop}>
              <View style={[s.num, done(p) && s.numDone]}>
                {done(p) ? <Icon name="check" size={14} color={color.textOnAction} /> : <T style={s.numText}>{i + 1}</T>}
              </View>
              <T v="headingS">Bilag {i + 1}</T>
              <T v="caption" c={color.textSecondary} style={{ marginLeft: 'auto' }}>
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
              spellCheck={false}
              value={p.link}
              onChangeText={(t) => patch(i, { link: t })}
            />
            {p.file ? (
              <View style={s.file}>
                <Icon name="check" size={16} />
                <T v="bodyS" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                  {p.file.name}
                </T>
                <Pressable accessibilityRole="button" accessibilityLabel={`Fjern ${p.file.name}`} onPress={() => patch(i, { file: undefined })} style={s.remove}>
                  <Icon name="close" size={16} />
                </Pressable>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => attach(i)} style={({ pressed }) => [s.attach, pressed && { transform: [{ scale: 0.97 }] }]}>
                <Icon name="plus" size={16} />
                <T v="label">Vedhæft fil</T>
              </Pressable>
            )}
          </AccPanel>
        ))}
      </View>

      {!!error && (
        <T v="bodyS" c={color.danger}>
          {error}
        </T>
      )}
      <Button block disabled={!ready} loading={busy} onPress={submit}>
        Send ansøgning
      </Button>
    </>
  );
}

const steps = ['Ansøgning sendt', 'Under behandling', 'Afgørelse'];

function StatusView({ app, onWithdraw, onAgain }: { app: Application; onWithdraw: () => void; onAgain: () => void }) {
  const decided = app.status === 'godkendt' || app.status === 'afvist';
  const current = decided ? 3 : 1;
  const sentAt = new Date(app.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
  const fileName = (path: string) => path.split('/').pop()!.replace(/^\d+-\d-/, '');

  return (
    <>
      {app.status === 'behandles' && (
        <AccPanel style={{ gap: 8 }}>
          <View style={[s.badge, { backgroundColor: color.accentNoteBg }]}>
            <T v="captionStrong" c={color.accentNoteText}>
              Under behandling
            </T>
          </View>
          <T v="headingM">Vi gennemgår din ansøgning</T>
          <T v="bodyS" c={color.textSecondary}>
            Du får en notifikation, når der er en afgørelse. Det tager normalt op til 14 dage.
          </T>
        </AccPanel>
      )}
      {app.status === 'godkendt' && (
        <AccPanel style={{ gap: 8 }}>
          <View style={[s.badge, { backgroundColor: color.actionPrimary }]}>
            <T v="captionStrong" c={color.textOnAction}>
              Godkendt
            </T>
          </View>
          <View style={s.approved}>
            <View style={s.globe}>
              <Icon name="globe" size={22} color={color.textOnAction} />
            </View>
            <T v="headingM" style={{ flex: 1 }}>
              Du er registreret som offentlig person
            </T>
          </View>
          <T v="bodyS" c={color.textSecondary}>
            Globussen vises nu ved dit navn på din profil, dine opslag og i søgning.
          </T>
        </AccPanel>
      )}
      {app.status === 'afvist' && (
        <AccPanel style={{ gap: 8 }}>
          <View style={[s.badge, { backgroundColor: '#fdecea' }]}>
            <T v="captionStrong" c={color.danger}>
              Afvist
            </T>
          </View>
          <T v="headingM">Ansøgningen blev ikke godkendt</T>
          <T v="bodyS" c={color.textSecondary}>
            Dokumentationen viste ikke en bred offentlig rolle. Du kan søge igen med nye bilag.
          </T>
          <Button variant="secondary" onPress={onAgain}>
            Søg igen
          </Button>
        </AccPanel>
      )}

      <View style={s.steps} accessibilityLabel="Forløb">
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'now' : 'next';
          const text = i === 2 && decided ? (app.status === 'godkendt' ? 'Godkendt' : 'Afvist') : label;
          return (
            <View key={label} style={s.step}>
              {i < steps.length - 1 && <View style={s.stepLine} />}
              <View style={[s.dot, state === 'done' && s.dotDone, state === 'now' && s.dotNow]}>
                {state === 'done' && <Icon name={i === 2 && app.status === 'afvist' ? 'close' : 'check'} size={12} color={color.textOnAction} />}
                {state === 'now' && <View style={s.dotInner} />}
              </View>
              <T v="bodyS" c={state === 'next' ? color.textSecondary : color.textPrimary}>
                {text}
              </T>
              {i === 0 && (
                <T v="caption" c={color.textSecondary} style={{ marginLeft: 'auto' }}>
                  {sentAt}
                </T>
              )}
            </View>
          );
        })}
      </View>

      <T v="headingS" accessibilityRole="header">
        Dine bilag · {app.category}
      </T>
      <View style={{ gap: 8 }}>
        {app.links.map((link, i) => (
          <AccCard key={i}>
            <Icon name={link ? 'link' : 'check'} size={18} />
            <View style={s.text}>
              <T v="bodyS" numberOfLines={1}>
                {link || fileName(app.attachment_paths[i] ?? '')}
              </T>
              {!!link && !!app.attachment_paths[i] && (
                <T v="caption" c={color.textSecondary} numberOfLines={1}>
                  + {fileName(app.attachment_paths[i]!)}
                </T>
              )}
            </View>
          </AccCard>
        ))}
      </View>

      {app.status === 'behandles' && (
        <Button variant="danger" style={{ alignSelf: 'center' }} onPress={onWithdraw}>
          Træk ansøgningen tilbage
        </Button>
      )}
    </>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: color.bgSubtle },
  globe: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.actionPrimary, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  criteria: { gap: 8, marginTop: -4 },
  criterion: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  evidence: { gap: 10, marginTop: -4 },
  proof: { gap: 8, padding: 14 },
  proofTop: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  numDone: { backgroundColor: color.actionPrimary },
  numText: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 14 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch', paddingLeft: 14, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  remove: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  attach: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, paddingHorizontal: 20, marginLeft: -12, borderRadius: radius.pill },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  approved: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  steps: { paddingHorizontal: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  stepLine: { position: 'absolute', left: 10, top: 30, bottom: -10, width: 2, backgroundColor: color.borderDefault },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { borderColor: color.actionPrimary, backgroundColor: color.actionPrimary },
  dotNow: { borderColor: color.textPrimary },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.textPrimary },
});
