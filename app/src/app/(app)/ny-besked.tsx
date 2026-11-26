import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import type { Member } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, radius } from '@/theme/tokens';

/** Ny besked: vælg én (direkte) eller flere (en cirkel) */
export default function NewMessage() {
  const me = useMe();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [picked, setPicked] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Uden søgning: dem, du følger. Med søgning: navn eller brugernavn.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const term = q.trim().replace(/^@/, '').replace(/[%_,()]/g, '');
      let list: Member[] = [];
      if (term) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_path')
          .or(`name.ilike.%${term}%,username.ilike.%${term}%`)
          .neq('id', me.id)
          .order('name')
          .limit(25);
        list = (data ?? []) as Member[];
      } else {
        const { data: f } = await supabase.from('follows').select('followee_id').eq('follower_id', me.id).eq('status', 'accepted').limit(100);
        const ids = (f ?? []).map((r) => r.followee_id);
        if (ids.length) {
          const { data } = await supabase.from('profiles').select('id, username, name, avatar_path').in('id', ids).order('name');
          list = (data ?? []) as Member[];
        }
      }
      if (alive) setResults(list);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, me.id]);

  const toggle = (m: Member) => setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));

  const start = async () => {
    if (!picked.length) return;
    setBusy(true);
    setError('');
    const group = picked.length > 1;
    const { data, error } = await supabase.rpc('start_conversation', {
      member_ids: picked.map((m) => m.id),
      group_name: group && groupName.trim() ? groupName.trim() : null,
    });
    setBusy(false);
    if (error || !data) {
      setError('Samtalen kunne ikke startes.');
      return;
    }
    router.replace(`/samtale/${data}`);
  };

  return (
    <Screen
      title={picked.length > 1 ? 'Ny cirkel' : 'Ny besked'}
      scroll={false}
      footer={
        picked.length > 0 ? (
          <View style={s.footer}>
            {!!error && (
              <T v="caption" c={color.danger}>
                {error}
              </T>
            )}
            <Button
              block
              loading={busy}
              title={picked.length === 1 ? `Skriv til ${picked[0]!.name.split(' ')[0]}` : `Opret cirkel (${picked.length + 1})`}
              onPress={start}
            />
          </View>
        ) : undefined
      }
    >
      <View style={s.top}>
        <TextField label="Søg" showLabel={false} placeholder="Søg efter navn eller brugernavn" autoCapitalize="none" autoCorrect={false} value={q} onChangeText={setQ} autoFocus />
        {picked.length > 0 && (
          <View style={s.picked}>
            {picked.map((m) => (
              <Chip key={m.id} small selected label={m.name.split(' ')[0]!} trailing="close" onPress={() => toggle(m)} />
            ))}
          </View>
        )}
        {picked.length > 1 && (
          <TextField label="Navn på cirkel" showLabel={false} placeholder="Navn på cirkel (valgfrit)" maxLength={60} value={groupName} onChangeText={setGroupName} />
        )}
      </View>
      <FlatList
        data={results}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListHeaderComponent={
          <T v="captionStrong" c={color.textSecondary} style={{ paddingVertical: 8 }}>
            {q.trim() ? 'Resultater' : 'Dem, du følger'}
          </T>
        }
        ListEmptyComponent={
          <T v="bodyS" c={color.textSecondary} style={{ paddingTop: 12 }}>
            {q.trim() ? 'Ingen fundet.' : 'Søg efter nogen at skrive til.'}
          </T>
        }
        renderItem={({ item: m }) => {
          const on = picked.some((x) => x.id === m.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={m.name}
              onPress={() => toggle(m)}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}
            >
              <Avatar name={m.name} path={m.avatar_path} />
              <View style={{ flex: 1 }}>
                <T v="headingS" numberOfLines={1}>
                  {m.name}
                </T>
                <T v="caption" c={color.textSecondary}>
                  @{m.username}
                </T>
              </View>
              <View style={[s.check, on && s.checkOn]}>{on && <Icon name="check" size={16} color={color.white} />}</View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  picked: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 8, borderRadius: radius.lg },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: color.actionPrimary, borderColor: color.actionPrimary },
  footer: { padding: 16, paddingTop: 8, gap: 6, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgApp },
});
