import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { MoreCard, MoreScreen } from '@/components/MoreParts';
import { T } from '@/components/T';
import { follow, unfollow } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

type Person = { id: string; username: string; name: string; avatar_path: string | null; reason?: string };

/** Udvid cirkel: anmodninger om at følge dig og forslag (prototypens FindFolk) */
export default function FindFolk() {
  const me = useMe();
  const [requests, setRequests] = useState<Person[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Person[] | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

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

  const answer = async (id: string, ok: boolean) => {
    if (ok) {
      setAccepted((a) => [...a, id]);
      await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', id).eq('followee_id', me.id);
    } else {
      setRequests((l) => l.filter((x) => x.id !== id));
      await supabase.from('follows').delete().eq('follower_id', id).eq('followee_id', me.id);
    }
  };

  const toggle = async (id: string) => {
    const on = !sent[id];
    setSent((m) => ({ ...m, [id]: on }));
    if (on) await follow(me.id, id);
    else await unfollow(me.id, id);
  };

  // Telefonens del-ark: vælg en kontakt og send en invitation
  const invite = () => {
    const url = Platform.OS === 'web' ? window.location.origin + window.location.pathname.replace(/find-folk\/?$/, '') : 'https://gustavmariegaard.github.io/proto/app/';
    Share.share({ message: `Kom med på ciircle: ${url}` });
  };

  const who = (p: Person, context: string) => (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/bruger/${p.username}`)} style={s.who}>
      <Avatar name={p.name} path={p.avatar_path} size="L" />
      <View style={s.text}>
        <T v="headingS" numberOfLines={1}>
          {p.name}
        </T>
        <T v="caption" c={color.textSecondary} numberOfLines={1}>
          {context}
        </T>
      </View>
    </Pressable>
  );

  return (
    <MoreScreen title="Udvid cirkel" tight>
      <T v="headingM" accessibilityRole="header">
        Vil følge dig
      </T>
      {requests.length === 0 && (
        <T v="caption" c={color.textSecondary}>
          Ingen nye anmodninger.
        </T>
      )}
      {requests.map((r) => (
        <MoreCard key={r.id} label={r.name}>
          {who(r, `@${r.username}`)}
          <View style={s.buttons} accessibilityLiveRegion="polite">
            {accepted.includes(r.id) ? (
              <Button variant="secondary" disabled style={s.half}>
                Følger dig nu
              </Button>
            ) : (
              <>
                <Button style={s.half} onPress={() => answer(r.id, true)}>
                  Accepter
                </Button>
                <Button variant="secondary" style={s.half} onPress={() => answer(r.id, false)}>
                  Slet
                </Button>
              </>
            )}
          </View>
        </MoreCard>
      ))}

      <T v="headingM" accessibilityRole="header">
        Forslag til dig
      </T>
      {suggestions?.length === 0 && (
        <T v="caption" c={color.textSecondary}>
          Ingen forslag lige nu.
        </T>
      )}
      {suggestions?.map((p) => {
        const isSent = !!sent[p.id];
        return (
          <View key={p.id} style={s.suggest}>
            {who(p, p.reason ?? `@${p.username}`)}
            <Button
              variant={isSent ? 'secondary' : 'primary'}
              accessibilityState={{ selected: isSent }}
              accessibilityLabel={isSent ? `Anmodning sendt til ${p.name}. Tryk for at fortryde` : `Følg ${p.name}`}
              onPress={() => toggle(p.id)}
            >
              {isSent ? 'Sendt' : 'Følg'}
            </Button>
          </View>
        );
      })}

      <View style={s.note}>
        <T v="headingS" c={color.accentNoteText}>
          Find venner via dine kontakter
        </T>
        <Button onPress={invite}>Vælg kontakter</Button>
      </View>
    </MoreScreen>
  );
}

const s = StyleSheet.create({
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  buttons: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, minWidth: 0 },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.lg,
    backgroundColor: color.bgSurface,
  },
  note: { alignItems: 'flex-start', gap: 10, padding: 16, borderRadius: radius.lg, backgroundColor: color.accentNoteBg },
});
