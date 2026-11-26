import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { color } from '@/theme/tokens';

/** Rediger interesser: dem, du følger i Offentlig debat */
export default function Interests() {
  const me = useMe();
  const [mine, setMine] = useState<string[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase
      .from('interests')
      .select('topic')
      .eq('user_id', me.id)
      .order('topic')
      .then(({ data }) => setMine((data ?? []).map((d) => d.topic)));
  }, [me.id]);

  const add = async (t: string) => {
    setMine((l) => [...l, t]);
    await supabase.from('interests').upsert({ user_id: me.id, topic: t, active: true });
  };
  const remove = async (t: string) => {
    setMine((l) => l.filter((x) => x !== t));
    await supabase.from('interests').delete().eq('user_id', me.id).eq('topic', t);
  };

  const query = q.trim().toLowerCase();
  const rest = allTopics.filter((t) => !mine.includes(t) && t.toLowerCase().includes(query));

  return (
    <Screen title="Rediger interesser">
      <TextField label="Søg efter interesser" showLabel={false} placeholder="Søg efter interesser" value={q} onChangeText={setQ} autoCorrect={false} />

      <T v="headingM" accessibilityRole="header">
        Dine interesser
      </T>
      {mine.length ? (
        <View style={s.wrap}>
          {mine.map((t) => (
            <Chip key={t} label={t} selected trailing="close" onPress={() => remove(t)} />
          ))}
        </View>
      ) : (
        <T v="bodyS" c={color.textSecondary}>
          Ingen endnu. Uden interesser ser du hele debatten.
        </T>
      )}

      <T v="headingM" accessibilityRole="header">
        {query ? 'Resultater' : 'Alle interesser'}
      </T>
      <View style={s.wrap}>
        {rest.map((t) => (
          <Chip key={t} label={t} trailing="plus" onPress={() => add(t)} />
        ))}
        {rest.length === 0 && (
          <T v="bodyS" c={color.textSecondary}>
            Ingen interesser matcher.
          </T>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
