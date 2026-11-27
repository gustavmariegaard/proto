import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccPanel, AccScreen, useDraft } from '@/components/AccountParts';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ToggleList } from '@/components/CreateParts';
import { MoreCard } from '@/components/MoreParts';
import { SaveBar, SavedToast } from '@/components/SaveBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { ageOf, childAreas, possessive, screenTimeOptions } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { color } from '@/theme/tokens';

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
type Draft = Settings & { private: boolean };

/** Ét barns indstillinger (prototypens ChildSettingsScreen). Ændringer gemmes med "Gem ændringer". Rute: /foraeldrekontrol/:id */
export default function ChildSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [child, setChild] = useState<Child | null | undefined>(undefined);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [requests, setRequests] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [{ data: kids }, { data: settings }, { data: reqs }] = await Promise.all([
      supabase.rpc('my_children'),
      supabase.from('child_settings').select('areas, sensitive, blocked_topics, approve_followers, screen_time, bedtime').eq('child_id', id).maybeSingle(),
      supabase.rpc('child_follow_requests', { c: id }),
    ]);
    setChild(((kids ?? []) as Child[]).find((c) => c.id === id) ?? null);
    setSaved(settings as Settings | null);
    setRequests((reqs ?? []) as Person[]);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (!child || !saved)
    return (
      <AccScreen title="Forældrekontrol" fallback="/foraeldrekontrol">
        {child === null && <T v="bodyS">Barnet er ikke tilknyttet dig.</T>}
      </AccScreen>
    );

  return (
    <Editor
      child={child}
      saved={saved}
      requests={requests}
      onSaved={(next) => {
        setSaved(next);
        setChild({ ...child, is_private: (next as Draft).private });
      }}
      onAnswered={(fid) => setRequests((l) => l.filter((r) => r.id !== fid))}
    />
  );
}

function Editor({
  child,
  saved,
  requests,
  onSaved,
  onAnswered,
}: {
  child: Child;
  saved: Settings;
  requests: Person[];
  onSaved: (s: Draft) => void;
  onAnswered: (followerId: string) => void;
}) {
  const d = useDraft<Draft>({ ...saved, private: child.is_private });
  const s = d.draft;
  const [topic, setTopic] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const first = child.name.split(' ')[0]!;
  const age = ageOf(child.birthdate);
  const q = topic.trim().toLowerCase();
  const suggestions = q ? allTopics.filter((t) => t.toLowerCase().includes(q) && !s.blocked_topics.includes(t)).slice(0, 6) : [];

  const save = async () => {
    setSaving(true);
    const { private: priv, ...settings } = s;
    await supabase.from('child_settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('child_id', child.id);
    if (priv !== child.is_private) await supabase.rpc('set_child_private', { c: child.id, p: priv });
    setSaving(false);
    onSaved(s);
    d.saved();
  };
  const answer = async (follower: string, ok: boolean) => {
    onAnswered(follower);
    await supabase.rpc('answer_child_follow', { c: child.id, follower, ok });
  };
  const remove = async () => {
    await supabase.from('guardian_links').delete().eq('child_id', child.id);
    router.replace('/foraeldrekontrol');
  };

  return (
    <AccScreen
      title={first}
      fallback="/foraeldrekontrol"
      footer={
        <>
          <SaveBar dirty={d.dirty} saving={saving} onSave={save} onReset={d.reset} note={`Ændringerne gælder først for ${first}, når du gemmer.`} />
          <SavedToast show={d.toast} />
        </>
      }
    >
      <View style={st.child}>
        <Avatar name={child.name} path={child.avatar_path} size="L" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="headingM">
            {first}
            {age !== null ? `, ${age} år` : ''}
          </T>
          <T v="caption" c={color.textSecondary}>
            @{child.username}
          </T>
        </View>
      </View>

      {/* ---------- Tid ---------- */}
      <T v="headingM" accessibilityRole="header">
        Daglig skærmtid
      </T>
      <View style={st.chips} accessibilityRole="radiogroup" accessibilityLabel="Daglig skærmtid">
        {screenTimeOptions.map((o) => (
          <Chip key={o} selected={s.screen_time === o} onPress={() => d.patch({ screen_time: o })}>
            {o}
          </Chip>
        ))}
      </View>
      <ToggleList
        rows={[{ id: 'bedtime', title: 'Ro om natten', hint: 'Appen er lukket fra klokken 21 til 7.' }]}
        values={{ bedtime: s.bedtime }}
        onToggle={() => d.patch({ bedtime: !s.bedtime })}
      />

      {/* ---------- Indhold ---------- */}
      <T v="headingM" accessibilityRole="header">
        Hvad må {first} bruge?
      </T>
      <ToggleList rows={[...childAreas]} values={s.areas} onToggle={(a) => d.patch({ areas: { ...s.areas, [a]: !s.areas[a] } })} />
      <ToggleList
        rows={[{ id: 'sensitive', title: 'Skjul følsomt indhold', hint: 'Skjuler nøgenhed, selvskade og grafiske billeder. Vold er aldrig tilladt på ciircle.' }]}
        values={{ sensitive: s.sensitive }}
        onToggle={() => d.patch({ sensitive: !s.sensitive })}
      />

      <T v="headingS" accessibilityRole="header">
        Blokerede emner
      </T>
      {s.blocked_topics.length > 0 && (
        <View style={st.chips}>
          {s.blocked_topics.map((t) => (
            <Chip key={t} selected trailing="close" onPress={() => d.patch({ blocked_topics: s.blocked_topics.filter((x) => x !== t) })}>
              {t}
            </Chip>
          ))}
        </View>
      )}
      <TextField label="Bloker et emne" showLabel={false} value={topic} onChangeText={setTopic} />
      {suggestions.length > 0 && (
        <View style={st.chips}>
          {suggestions.map((t) => (
            <Chip
              key={t}
              trailing="plus"
              onPress={() => {
                d.patch({ blocked_topics: [...s.blocked_topics, t] });
                setTopic('');
              }}
            >
              {t}
            </Chip>
          ))}
        </View>
      )}

      {/* ---------- Profil ---------- */}
      <T v="headingM" accessibilityRole="header">
        Hvem kan se {possessive(first)} profil?
      </T>
      <SegmentedControl
        label={`Hvem kan se ${possessive(first)} profil?`}
        value={s.private ? 'privat' : 'offentlig'}
        onChange={(v) => d.patch({ private: v === 'privat' })}
        options={[
          { value: 'offentlig', label: 'Offentlig' },
          { value: 'privat', label: 'Privat' },
        ]}
      />

      {/* ---------- Følgere ---------- */}
      <T v="headingM" accessibilityRole="header">
        Følgere
      </T>
      <ToggleList
        rows={[{ id: 'approve', title: 'Godkend nye følgere', hint: `Du skal godkende, før nogen kan følge ${first}.` }]}
        values={{ approve: s.approve_followers }}
        onToggle={() => d.patch({ approve_followers: !s.approve_followers })}
      />
      {requests.map((r) => (
        <MoreCard key={r.id} label={r.name}>
          <View style={st.row}>
            <Avatar name={r.name} path={r.avatar_path} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T v="headingS" numberOfLines={1}>
                {r.name}
              </T>
              <T v="caption" c={color.textSecondary} numberOfLines={1}>
                Vil følge {first}
              </T>
            </View>
          </View>
          <View style={st.buttons}>
            <Button style={{ flex: 1 }} onPress={() => answer(r.id, true)}>
              Godkend
            </Button>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => answer(r.id, false)}>
              Afvis
            </Button>
          </View>
        </MoreCard>
      ))}

      {/* ---------- Fjern ---------- */}
      {confirmRemove ? (
        <AccPanel>
          <T v="bodyS">
            Fjern tilknytningen til {first}? Indstillingerne gælder ikke længere.
          </T>
          <View style={[st.buttons, { alignSelf: 'stretch' }]}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setConfirmRemove(false)}>
              Annuller
            </Button>
            <Button style={{ flex: 1 }} onPress={remove}>
              Fjern
            </Button>
          </View>
        </AccPanel>
      ) : (
        <Button variant="danger" style={{ alignSelf: 'center' }} onPress={() => setConfirmRemove(true)}>
          Fjern tilknytning
        </Button>
      )}
    </AccScreen>
  );
}

const st = StyleSheet.create({
  child: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttons: { flexDirection: 'row', gap: 8 },
});
