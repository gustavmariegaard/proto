import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { PersonRow } from '@/components/PersonRow';
import { Screen } from '@/components/Screen';
import { SmallButton } from '@/components/SmallButton';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { follow, unfollow } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

type Person = { id: string; username: string; name: string; avatar_path: string | null; reason?: string };

/** Udvid cirkel: anmodninger om at følge dig, forslag (venners venner og folk fra dine grupper) og søg */
export default function FindFolk() {
  const me = useMe();
  const [requests, setRequests] = useState<Person[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Person[] | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [r, sg] = await Promise.all([
      supabase.from('follows').select('profiles!follows_follower_id_fkey(id, username, name, avatar_path)').eq('followee_id', me.id).eq('status', 'pending'),
      supabase.rpc('suggest_people', { max_rows: 20 }),
    ]);
    setRequests(((r.data ?? []) as any[]).map((x) => x.profiles).filter(Boolean));
    setSuggestions((sg.data ?? []) as Person[]);
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Søg efter navn eller brugernavn
  useEffect(() => {
    const q = query.trim().replace(/^@/, '').replace(/[,()%*]/g, '');
    if (q.length < 2) return setResults([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_path')
        .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq('id', me.id)
        .limit(20);
      setResults((data ?? []) as Person[]);
    }, 250);
    return () => clearTimeout(t);
  }, [query, me.id]);

  const answer = async (id: string, ok: boolean) => {
    if (ok) {
      await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', id).eq('followee_id', me.id);
      setAccepted((a) => [...a, id]);
    } else {
      await supabase.from('follows').delete().eq('follower_id', id).eq('followee_id', me.id);
      setRequests((l) => l.filter((x) => x.id !== id));
    }
  };

  const toggle = async (id: string) => {
    const on = !sent[id];
    setSent((m) => ({ ...m, [id]: on }));
    if (on) await follow(me.id, id);
    else await unfollow(me.id, id);
  };

  const invite = () => {
    const url = Platform.OS === 'web' ? window.location.origin + window.location.pathname.replace(/find-folk\/?$/, '') : 'https://gustavmariegaard.github.io/proto/app/';
    Share.share({ message: `Kom med på ciircle: ${url}` });
  };

  const followBtn = (p: Person) => <SmallButton title={sent[p.id] ? 'Sendt' : 'Følg'} dark={!sent[p.id]} onPress={() => toggle(p.id)} />;

  return (
    <Screen title="Udvid cirkel">
      <TextField label="Søg efter navn eller brugernavn" showLabel={false} placeholder="Søg efter navn eller brugernavn" autoCapitalize="none" autoCorrect={false} value={query} onChangeText={setQuery} />

      {query.trim().length >= 2 ? (
        <View style={{ gap: 8 }}>
          {results.length === 0 && (
            <T v="bodyS" c={color.textSecondary}>
              Ingen fundet.
            </T>
          )}
          {results.map((p) => (
            <PersonRow key={p.id} name={p.name} username={p.username} avatar={p.avatar_path}>
              {followBtn(p)}
            </PersonRow>
          ))}
        </View>
      ) : (
        <>
          <T v="headingM">Vil følge dig</T>
          {requests.length === 0 ? (
            <T v="caption" c={color.textSecondary}>
              Ingen nye anmodninger.
            </T>
          ) : (
            requests.map((r) => (
              <PersonRow key={r.id} name={r.name} username={r.username} avatar={r.avatar_path}>
                {accepted.includes(r.id) ? (
                  <T v="captionStrong" c={color.textSecondary}>
                    Følger dig nu
                  </T>
                ) : (
                  <>
                    <SmallButton title="Accepter" dark onPress={() => answer(r.id, true)} />
                    <SmallButton title="Slet" onPress={() => answer(r.id, false)} />
                  </>
                )}
              </PersonRow>
            ))
          )}

          <T v="headingM">Forslag til dig</T>
          {suggestions?.length === 0 && (
            <T v="caption" c={color.textSecondary}>
              Ingen forslag lige nu. Følg flere eller bliv medlem af en gruppe.
            </T>
          )}
          {suggestions?.map((p) => (
            <View key={p.id} style={{ gap: 2 }}>
              <PersonRow name={p.name} username={p.username} avatar={p.avatar_path}>
                {followBtn(p)}
              </PersonRow>
              {!!p.reason && (
                <T v="caption" c={color.textSecondary} style={{ paddingLeft: 66 }}>
                  {p.reason}
                </T>
              )}
            </View>
          ))}

          <View style={s.invite}>
            <T v="headingS">Inviter venner</T>
            <Button title="Del invitation" variant="secondary" icon="send" onPress={invite} />
          </View>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  invite: { gap: 10, padding: 16, borderRadius: radius.xl, backgroundColor: color.bgSubtle, alignItems: 'flex-start' },
});
