import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ToggleList } from '@/components/CreateParts';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { fmtNumber } from '@/lib/time';
import { color, radius } from '@/theme/tokens';

type ProfileType = 'privat' | 'skaber' | 'virksomhed';

const profileTypes: { value: ProfileType; label: string }[] = [
  { value: 'privat', label: 'Privat' },
  { value: 'skaber', label: 'Skaber' },
  { value: 'virksomhed', label: 'Virksomhed' },
];

const profileTypeHints: Record<ProfileType, string> = {
  privat: 'Din profil er kun for dem, du selv vælger.',
  skaber: 'Tag imod drikkepenge og abonnementer fra dem, der følger dig.',
  virksomhed: 'Sælg på Torvet og annoncér for folk i hele EU.',
};

const creatorToggles = [
  { id: 'tips', title: 'Tag imod drikkepenge', hint: 'Følgere kan støtte dine opslag og Flicks.' },
  { id: 'abonnement', title: 'Abonnement for følgere', hint: 'Pris: [DIN PRIS] kr. om måneden.' },
  { id: 'butik', title: 'Butik på Torvet', hint: 'Sælg varer med sikker betaling i appen.' },
  { id: 'annoncer', title: 'Annoncer ved mine Flicks', hint: 'Kun virksomheder i EU kan annoncere. Du kan se, hvorfor en annonce vises.' },
];

const creatorToggleDefaults: Record<string, boolean> = { tips: true, abonnement: false, butik: false, annoncer: true };

/**
 * Skaber og virksomhed (prototypens Creator): profiltype, publikum, indtægter og annoncer.
 * Publikum er rigtige samlede tal. Visninger findes ikke i databasen og vises som en streg.
 */
export default function Creator() {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ProfileType>('skaber');
  const [toggles, setToggles] = useState(creatorToggleDefaults);
  const [topic, setTopic] = useState('');
  const [budget, setBudget] = useState('');
  const [created, setCreated] = useState(false);
  const [stats, setStats] = useState<{ followers: number; comments: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.rpc('creator_stats').then(({ data }) => {
        const r = (data as Record<string, number>[] | null)?.[0];
        if (r) setStats({ followers: Number(r.followers), comments: Number(r.comments) });
      });
    }, []),
  );

  const audience: [string, number | null][] = [
    ['Visninger', null],
    ['Følgere', stats ? stats.followers : null],
    ['Svar', stats ? stats.comments : null],
  ];

  return (
    <View style={s.root}>
      <PageHeader title="Skaber og virksomhed" fallback="/" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <T v="headingS">Din profiltype</T>
        <SegmentedControl label="Din profiltype" options={profileTypes} value={type} onChange={setType} />
        <T v="caption" c={color.textSecondary}>
          {profileTypeHints[type]}
        </T>

        <View style={s.panel}>
          <T v="headingM" accessibilityRole="header">
            Dit publikum
          </T>
          <T v="caption" c={color.textSecondary}>
            Du ser kun samlede tal. Vi viser aldrig, hvem enkeltpersoner er.
          </T>
          <View style={s.stats}>
            {audience.map(([label, n]) => (
              <View key={label} style={s.stat} accessible accessibilityLabel={`${label}: ${n === null ? 'ingen tal endnu' : fmtNumber(n)}`}>
                <T v="headingM">{n === null ? '—' : fmtNumber(n)}</T>
                <T v="caption" c={color.textSecondary}>
                  {label}
                </T>
              </View>
            ))}
          </View>
        </View>

        <ToggleList rows={creatorToggles} values={toggles} onToggle={(id) => setToggles((v) => ({ ...v, [id]: !v[id] }))} />

        <View style={s.panel}>
          <T v="headingM" accessibilityRole="header">
            Annoncér i ciircle
          </T>
          <T v="caption" c={color.textSecondary}>
            Vælg emner og område. Kun virksomheder i EU kan annoncere.
          </T>
          <TextField
            label="[Emne, fx Cykler]"
            showLabel={false}
            value={topic}
            onChangeText={(v) => {
              setTopic(v);
              setCreated(false);
            }}
          />
          <TextField
            label="[Budget i kr.]"
            showLabel={false}
            inputMode="numeric"
            value={budget}
            onChangeText={(v) => {
              setBudget(v.replace(/[^\d]/g, ''));
              setCreated(false);
            }}
          />
          <Button disabled={!topic.trim() || !budget} onPress={() => setCreated(true)}>
            Opret annonce
          </Button>
          <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
            {created ? `Din annonce om ${topic.trim()} er oprettet med et budget på ${budget} kr.` : ''}
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  panel: {
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.xl,
    backgroundColor: color.bgSurface,
  },
  stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: radius.md, backgroundColor: color.bgSunken },
});
