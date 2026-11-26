import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { PersonRow } from '@/components/PersonRow';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { useMe, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

type Person = { id: string; username: string; name: string; avatar_path: string | null };

/** Privatliv: offentlig/privat profil, følgeanmodninger, blokerede og skjulte i debatten */
export default function Privacy() {
  const me = useMe();
  const { refreshProfile } = useSession();
  const [requests, setRequests] = useState<Person[]>([]);
  const [blocked, setBlocked] = useState<Person[]>([]);
  const [muted, setMuted] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [r, b, m] = await Promise.all([
      supabase.from('follows').select('profiles!follows_follower_id_fkey(id, username, name, avatar_path)').eq('followee_id', me.id).eq('status', 'pending'),
      supabase.rpc('my_blocked'),
      supabase.from('debate_mutes').select('profiles!debate_mutes_muted_id_fkey(id, username, name, avatar_path)').eq('user_id', me.id),
    ]);
    setRequests(((r.data ?? []) as any[]).map((x) => x.profiles).filter(Boolean));
    setBlocked((b.data ?? []) as Person[]);
    setMuted(((m.data ?? []) as any[]).map((x) => x.profiles).filter(Boolean));
  }, [me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setPrivate = async (v: boolean) => {
    await supabase.from('profiles').update({ is_private: v }).eq('id', me.id);
    await refreshProfile();
  };

  const answer = async (id: string, ok: boolean) => {
    if (ok) await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', id).eq('followee_id', me.id);
    else await supabase.from('follows').delete().eq('follower_id', id).eq('followee_id', me.id);
    load();
  };

  return (
    <Screen title="Privatliv">
      <T v="headingM">Hvem kan se din profil?</T>
      <Segmented
        label="Hvem kan se din profil?"
        value={me.is_private ? 'privat' : 'offentlig'}
        onChange={(v) => setPrivate(v === 'privat')}
        options={[
          { value: 'offentlig', label: 'Offentlig' },
          { value: 'privat', label: 'Privat' },
        ]}
      />
      <T v="caption" c={color.textSecondary}>
        {me.is_private ? 'Kun dine følgere kan se dine opslag. Dine debatopslag er altid offentlige.' : 'Alle kan se dine opslag.'}
      </T>

      {requests.length > 0 && (
        <>
          <T v="headingM">Følgeanmodninger</T>
          <View style={{ gap: 8 }}>
            {requests.map((p) => (
              <PersonRow key={p.id} name={p.name} username={p.username} avatar={p.avatar_path}>
                <SmallButton title="Afvis" onPress={() => answer(p.id, false)} />
                <SmallButton title="Godkend" dark onPress={() => answer(p.id, true)} />
              </PersonRow>
            ))}
          </View>
        </>
      )}

      <T v="headingM">Blokerede</T>
      <List
        people={blocked}
        action="Fjern blokering"
        link={false}
        onAction={async (id) => {
          await supabase.from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', id);
          load();
        }}
        empty="Du har ikke blokeret nogen. Du blokerer en profil via ⋯ på profilen."
      />

      <T v="headingM">Skjult i Offentlig debat</T>
      <List
        people={muted}
        action="Vis igen"
        onAction={async (id) => {
          await supabase.from('debate_mutes').delete().eq('user_id', me.id).eq('muted_id', id);
          load();
        }}
        empty="Ingen. Du skjuler en afsender via ⋯ på et opslag i debatten."
      />
    </Screen>
  );
}

function List({ people, action, onAction, empty, link = true }: { people: Person[]; action: string; onAction: (id: string) => void; empty: string; link?: boolean }) {
  if (!people.length) {
    return (
      <View style={{ padding: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface }}>
        <T v="bodyS" c={color.textSecondary}>
          {empty}
        </T>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {people.map((p) => (
        <PersonRow key={p.id} name={p.name} username={p.username} avatar={p.avatar_path} link={link}>
          <SmallButton title={action} onPress={() => onAction(p.id)} />
        </PersonRow>
      ))}
    </View>
  );
}
