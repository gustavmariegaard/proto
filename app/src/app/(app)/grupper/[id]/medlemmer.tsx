import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { MenuItem } from '@/components/MenuItem';
import { PersonRow } from '@/components/PersonRow';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { getGroup, groupMembers, type GroupCard, type Member } from '@/lib/community';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

/** Medlemmer: admins godkender anmodninger, gør andre til admin og fjerner medlemmer */
export default function GroupMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [group, setGroup] = useState<GroupCard | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const [g, m] = await Promise.all([getGroup(id), groupMembers(id)]);
    setGroup(g);
    setMembers(m);
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const admin = group?.my_status === 'medlem' && group.my_role === 'admin';
  const words = q.trim().toLocaleLowerCase('da').split(/\s+/).filter(Boolean);
  const match = (m: Member) => words.every((w) => `${m.name} ${m.username}`.toLocaleLowerCase('da').includes(w));
  const requests = members.filter((m) => m.status === 'anmodet');
  const active = members.filter((m) => m.status === 'medlem' && match(m)).sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, 'da') : a.role === 'admin' ? -1 : 1));

  const update = async (m: Member, patch: Partial<Pick<Member, 'role' | 'status'>>) => {
    await supabase.from('group_members').update(patch).eq('group_id', id).eq('user_id', m.id);
    load();
  };
  const remove = async (m: Member) => {
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', m.id);
    load();
  };

  return (
    <Screen title="Medlemmer">
      {admin && requests.length > 0 && (
        <View style={{ gap: 8 }}>
          <T v="headingS">Anmodninger</T>
          {requests.map((m) => (
            <PersonRow key={m.id} name={m.name} username={m.username} avatar={m.avatar_path}>
              <SmallButton title="Afvis" onPress={() => remove(m)} />
              <SmallButton title="Godkend" dark onPress={() => update(m, { status: 'medlem' })} />
            </PersonRow>
          ))}
        </View>
      )}
      <TextField label="Søg blandt medlemmerne" showLabel={false} placeholder="Søg blandt medlemmerne" value={q} onChangeText={setQ} />
      <View style={{ gap: 8 }}>
        {active.map((m) => (
          <PersonRow key={m.id} name={m.id === me.id ? `${m.name} (dig)` : m.name} username={m.username} avatar={m.avatar_path}>
            {m.role === 'admin' && (
              <T v="captionStrong" c={color.green700} style={{ paddingHorizontal: 8 }}>
                Admin
              </T>
            )}
            {admin && m.id !== me.id && <SmallButton title="Mere" onPress={() => setPicked(m)} />}
          </PersonRow>
        ))}
        {active.length === 0 && (
          <T v="bodyS" c={color.textSecondary}>
            Ingen medlemmer matcher.
          </T>
        )}
      </View>
      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked?.name}>
        {picked && (
          <View>
            {picked.role === 'admin' ? (
              <MenuItem icon="user" label="Gør til medlem" onPress={() => (update(picked, { role: 'medlem' }), setPicked(null))} />
            ) : (
              <MenuItem icon="star" label="Gør til admin" onPress={() => (update(picked, { role: 'admin' }), setPicked(null))} />
            )}
            <MenuItem icon="user-minus" label="Fjern fra gruppen" danger onPress={() => (remove(picked), setPicked(null))} />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
