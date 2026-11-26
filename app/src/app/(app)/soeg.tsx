import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { PersonRow } from '@/components/PersonRow';
import { Screen } from '@/components/Screen';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { follow, unfollow } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

type Hit = { id: string; username: string; name: string; avatar_path: string | null; status: 'accepted' | 'pending' | null };

/** Søg efter folk på navn eller brugernavn */
export default function Search() {
  const me = useMe();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const term = q.trim().replace(/^@/, '').replace(/[%_,()]/g, '');
    if (term.length < 2) {
      setHits([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_path')
        .or(`name.ilike.%${term}%,username.ilike.%${term}%`)
        .neq('id', me.id)
        .limit(25);
      const people = (data ?? []) as Omit<Hit, 'status'>[];
      const { data: f } = people.length
        ? await supabase.from('follows').select('followee_id, status').eq('follower_id', me.id).in('followee_id', people.map((p) => p.id))
        : { data: [] };
      const st = new Map((f ?? []).map((x: any) => [x.followee_id, x.status]));
      if (alive) setHits(people.map((p) => ({ ...p, status: st.get(p.id) ?? null })));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, me.id]);

  const toggle = async (h: Hit) => {
    if (h.status) await unfollow(me.id, h.id);
    else await follow(me.id, h.id);
    const { data } = await supabase.from('follows').select('status').eq('follower_id', me.id).eq('followee_id', h.id).maybeSingle();
    setHits((l) => l.map((x) => (x.id === h.id ? { ...x, status: (data?.status as Hit['status']) ?? null } : x)));
  };

  return (
    <Screen title="Søg">
      <TextField label="Søg efter folk" showLabel={false} placeholder="Søg efter navn eller @brugernavn" autoCapitalize="none" autoFocus value={q} onChangeText={setQ} />
      {q.trim().length >= 2 && hits.length === 0 && (
        <T v="bodyS" c={color.textSecondary}>
          Ingen resultater
        </T>
      )}
      <View style={{ gap: 8 }}>
        {hits.map((h) => (
          <PersonRow key={h.id} name={h.name} username={h.username} avatar={h.avatar_path}>
            <SmallButton title={h.status === 'accepted' ? 'Følger' : h.status === 'pending' ? 'Anmodet' : 'Følg'} dark={!h.status} onPress={() => toggle(h)} />
          </PersonRow>
        ))}
      </View>
    </Screen>
  );
}
