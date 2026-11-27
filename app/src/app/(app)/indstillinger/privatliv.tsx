import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccPanel, AccScreen, PersonAction, useDraft } from '@/components/AccountParts';
import { Button } from '@/components/Button';
import { ToggleList } from '@/components/CreateParts';
import { SaveBar, SavedToast } from '@/components/SaveBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { useMe, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useUserSettings } from '@/lib/userSettings';
import { color } from '@/theme/tokens';

type Person = { id: string; username: string; name: string; avatar_path: string | null };

/** Privatliv og data: offentlig/privat profil, aktivitet, blokerede og sletning (prototypens PrivacySettings) */
export default function Privacy() {
  const me = useMe();
  const { refreshProfile, signOut } = useSession();
  const { settings, update } = useUserSettings(me.id);
  const [blocked, setBlocked] = useState<Person[]>([]);
  const [muted, setMuted] = useState<Person[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const d = useDraft({ private: !!me.is_private, hidden: !!settings?.hide_active });

  const load = useCallback(async () => {
    const [b, m] = await Promise.all([
      supabase.rpc('my_blocked'),
      supabase.from('debate_mutes').select('profiles!debate_mutes_muted_id_fkey(id, username, name, avatar_path)').eq('user_id', me.id),
    ]);
    setBlocked((b.data ?? []) as Person[]);
    setMuted(((m.data ?? []) as any[]).map((x) => x.profiles).filter(Boolean));
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    setSaving(true);
    if (d.draft.private !== !!me.is_private) {
      await supabase.from('profiles').update({ is_private: d.draft.private }).eq('id', me.id);
      await refreshProfile();
    }
    if (d.draft.hidden !== !!settings?.hide_active) await update({ hide_active: d.draft.hidden });
    setSaving(false);
    d.saved();
  };

  const deleteAccount = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('delete_my_account');
    setBusy(false);
    if (!error) await signOut();
  };

  const visibilityChanged = d.draft.private !== !!me.is_private;

  return (
    <AccScreen
      title="Privatliv og data"
      footer={
        <>
          <SaveBar
            dirty={d.dirty}
            saving={saving}
            onSave={save}
            onReset={d.reset}
            note={
              visibilityChanged
                ? d.draft.private
                  ? 'Din profil bliver privat. Kun dine følgere kan se dit indhold.'
                  : 'Din profil bliver offentlig. Alle kan se dit indhold.'
                : undefined
            }
          />
          <SavedToast show={d.toast} />
        </>
      }
    >
      <T v="headingM" accessibilityRole="header">
        Hvem kan se din profil?
      </T>
      <SegmentedControl
        label="Hvem kan se din profil?"
        value={d.draft.private ? 'privat' : 'offentlig'}
        onChange={(v) => d.patch({ private: v === 'privat' })}
        options={[
          { value: 'offentlig', label: 'Offentlig' },
          { value: 'privat', label: 'Privat' },
        ]}
      />

      <ToggleList
        rows={[{ id: 'aktiv', title: 'Skjul hvornår jeg er aktiv', hint: 'Andre kan ikke se, om du er online.' }]}
        values={{ aktiv: d.draft.hidden }}
        onToggle={() => d.patch({ hidden: !d.draft.hidden })}
      />

      <T v="headingM" accessibilityRole="header">
        Blokerede
      </T>
      <People
        people={blocked}
        action="Fjern blokering"
        onAction={async (id) => {
          setBlocked((l) => l.filter((p) => p.id !== id));
          await supabase.from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', id);
        }}
        empty="Du har ikke blokeret nogen. Du blokerer en profil via ⋯ på profilen."
      />

      {/* Ikke en blokering: de kan stadig se dig, og du ser dem i dit feed */}
      <T v="headingM" accessibilityRole="header">
        Skjult i Offentlig debat
      </T>
      <People
        people={muted}
        action="Vis igen"
        link
        onAction={async (id) => {
          setMuted((l) => l.filter((p) => p.id !== id));
          await supabase.from('debate_mutes').delete().eq('user_id', me.id).eq('muted_id', id);
        }}
        empty="Ingen. Du skjuler en afsender via ⋯ på et opslag i debatten."
      />

      {deleting ? (
        <AccPanel>
          <T v="bodyS">Slet din konto? Din profil, dine opslag, billeder og beskeder slettes med det samme.</T>
          <View style={s.buttons}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setDeleting(false)}>
              Annuller
            </Button>
            <Button style={{ flex: 1 }} loading={busy} onPress={deleteAccount}>
              Slet konto
            </Button>
          </View>
        </AccPanel>
      ) : (
        <Button variant="danger" style={{ alignSelf: 'center' }} onPress={() => setDeleting(true)}>
          Slet konto
        </Button>
      )}
    </AccScreen>
  );
}

/** Profiler i en liste med én knap pr. række */
function People({ people, action, onAction, empty, link = false }: { people: Person[]; action: string; onAction: (id: string) => void; empty: string; link?: boolean }) {
  if (!people.length)
    return (
      <AccPanel>
        <T v="bodyS" c={color.textSecondary}>
          {empty}
        </T>
      </AccPanel>
    );
  return (
    <View style={{ gap: 8 }}>
      {people.map((p) => (
        <PersonAction
          key={p.id}
          name={p.name}
          username={p.username}
          avatar={p.avatar_path}
          action={action}
          onAction={() => onAction(p.id)}
          onOpen={link ? () => router.push(`/bruger/${p.username}`) : undefined}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
});
