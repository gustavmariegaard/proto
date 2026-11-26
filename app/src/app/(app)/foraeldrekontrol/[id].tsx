import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { PersonRow } from '@/components/PersonRow';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { ageOf, childAreas, possessive, screenTimeOptions } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { color, radius } from '@/theme/tokens';

type Settings = {
  areas: Record<string, boolean>;
  sensitive: boolean;
  blocked_topics: string[];
  approve_followers: boolean;
  screen_time: string;
  bedtime: boolean;
};
type Child = { id: string; username: string; name: string; avatar_path: string | null; is_private: boolean; birthdate: string | null };
type Person = { id: string; username: string; name: string; avatar_path: string | null };

/** Ét barns indstillinger. Alt gemmes med det samme. Rute: /foraeldrekontrol/:id */
export default function ChildSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [child, setChild] = useState<Child | null | undefined>(undefined);
  const [s, setS] = useState<Settings | null>(null);
  const [requests, setRequests] = useState<Person[]>([]);
  const [topic, setTopic] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    const [{ data: kids }, { data: settings }, { data: reqs }] = await Promise.all([
      supabase.rpc('my_children'),
      supabase.from('child_settings').select('*').eq('child_id', id).maybeSingle(),
      supabase.rpc('child_follow_requests', { c: id }),
    ]);
    setChild(((kids ?? []) as Child[]).find((c) => c.id === id) ?? null);
    setS(settings as Settings | null);
    setRequests((reqs ?? []) as Person[]);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (child === undefined) return <Screen title="Forældrekontrol">{null}</Screen>;
  if (!child || !s) {
    return (
      <Screen title="Forældrekontrol">
        <T v="bodyS">Barnet er ikke tilknyttet dig.</T>
      </Screen>
    );
  }

  const first = child.name.split(' ')[0];
  const age = ageOf(child.birthdate);
  const set = async (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    await supabase.from('child_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('child_id', child.id);
  };
  const setPrivate = async (p: boolean) => {
    setChild({ ...child, is_private: p });
    await supabase.rpc('set_child_private', { c: child.id, p });
  };
  const answer = async (follower: string, ok: boolean) => {
    await supabase.rpc('answer_child_follow', { c: child.id, follower, ok });
    setRequests((l) => l.filter((r) => r.id !== follower));
  };
  const remove = async () => {
    await supabase.from('guardian_links').delete().eq('child_id', child.id);
    router.back();
  };
  const q = topic.trim().toLowerCase();
  const suggestions = q ? allTopics.filter((t) => t.toLowerCase().includes(q) && !s.blocked_topics.includes(t)).slice(0, 6) : [];

  return (
    <Screen title={first}>
      <View style={st.head}>
        <Avatar name={child.name} path={child.avatar_path} size="L" />
        <View style={{ flex: 1 }}>
          <T v="headingM">
            {child.name}
            {age !== null ? `, ${age} år` : ''}
          </T>
          <T v="caption" c={color.textSecondary}>
            @{child.username}
          </T>
        </View>
      </View>

      <T v="headingM">Daglig skærmtid</T>
      <View style={st.chips} accessibilityRole="radiogroup" accessibilityLabel="Daglig skærmtid">
        {screenTimeOptions.map((o) => (
          <Chip key={o} label={o} selected={s.screen_time === o} onPress={() => set({ screen_time: o })} />
        ))}
      </View>
      <Toggle title="Ro om natten" hint="Appen er lukket fra klokken 21 til 7." value={s.bedtime} onChange={(v) => set({ bedtime: v })} />

      <T v="headingM">Hvad må {first} bruge?</T>
      <View style={{ gap: 8 }}>
        {childAreas.map((a) => (
          <Toggle key={a.id} title={a.title} hint={a.hint} value={!!s.areas[a.id]} onChange={(v) => set({ areas: { ...s.areas, [a.id]: v } })} />
        ))}
      </View>
      <Toggle title="Skjul følsomt indhold" hint="Nøgenhed, selvskade og grafiske billeder." value={s.sensitive} onChange={(v) => set({ sensitive: v })} />

      <T v="headingS">Blokerede emner</T>
      {s.blocked_topics.length > 0 && (
        <View style={st.chips}>
          {s.blocked_topics.map((t) => (
            <Chip key={t} label={t} selected trailing="close" onPress={() => set({ blocked_topics: s.blocked_topics.filter((x) => x !== t) })} />
          ))}
        </View>
      )}
      <TextField label="Bloker et emne" showLabel={false} placeholder="Bloker et emne" value={topic} onChangeText={setTopic} />
      {suggestions.length > 0 && (
        <View style={st.chips}>
          {suggestions.map((t) => (
            <Chip
              key={t}
              label={t}
              trailing="plus"
              onPress={() => {
                set({ blocked_topics: [...s.blocked_topics, t] });
                setTopic('');
              }}
            />
          ))}
        </View>
      )}

      <T v="headingM">Hvem kan se {possessive(first)} profil?</T>
      <Segmented
        label={`Hvem kan se ${possessive(first)} profil?`}
        value={child.is_private ? 'privat' : 'offentlig'}
        onChange={(v) => setPrivate(v === 'privat')}
        options={[
          { value: 'offentlig', label: 'Offentlig' },
          { value: 'privat', label: 'Privat' },
        ]}
      />

      <T v="headingM">Godkend nye følgere</T>
      <Toggle title={`Du godkender, før nogen kan følge ${first}`} value={s.approve_followers} onChange={(v) => set({ approve_followers: v })} />
      {requests.length > 0 && (
        <View style={{ gap: 8 }}>
          {requests.map((r) => (
            <PersonRow key={r.id} name={r.name} username={r.username} avatar={r.avatar_path}>
              <SmallButton title="Godkend" dark onPress={() => answer(r.id, true)} />
              <SmallButton title="Afvis" onPress={() => answer(r.id, false)} />
            </PersonRow>
          ))}
        </View>
      )}

      {confirmRemove ? (
        <View style={st.panel}>
          <T v="bodyS">Fjern tilknytningen til {first}? Indstillingerne gælder ikke længere.</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Annuller" variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmRemove(false)} />
            <Button title="Fjern" style={{ flex: 1 }} onPress={remove} />
          </View>
        </View>
      ) : (
        <Button title="Fjern tilknytning" variant="danger" onPress={() => setConfirmRemove(true)} />
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: { gap: 12, padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
});
