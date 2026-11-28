import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { color } from '@/theme/tokens';
import { CheckBox } from './CheckBox';
import { MintTile } from './CreateFlow';
import { Choice, parts } from './CreateParts';
import { Sheet } from './Sheet';
import { T } from './T';
import { TextField } from './TextField';

/** Forslag til dig (samme liste som prototypens suggestedInterests) */
const suggestedInterests = ['Fotografi', 'Film', 'Løb', 'Klima', 'Sport', 'Litteratur', 'Politik', 'Gaming', 'Havearbejde'];

type Trend = { name: string; note: string };

/** Det, mange skriver om lige nu: de hyppigste emner på opslag og flicks fra det seneste døgn */
async function loadTrending(): Promise<Trend[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase.from('posts').select('tags').gt('created_at', since).limit(1000);
  const count = new Map<string, number>();
  for (const p of (data ?? []) as { tags: string[] | null }[]) for (const t of p.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da'))
    .slice(0, 5)
    .map(([name, n]) => ({ name, note: `${n.toLocaleString('da-DK')} opslag i dag` }));
}

/**
 * Rediger interesser (prototypens TopicsSheet): søg efter nye emner, se hvad der trender, og vælg eller fravælg.
 * Bruges både i arket (Offentlig debat og Flicks) og på /interesser.
 */
export function TopicsEditor() {
  const me = useMe();
  const [mine, setMine] = useState<string[]>([]);
  const [trending, setTrending] = useState<Trend[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('interests')
      .select('topic')
      .eq('user_id', me.id)
      .order('topic')
      .then(({ data }) => setMine((data ?? []).map((d) => d.topic)));
    loadTrending().then(setTrending);
  }, [me.id]);

  const has = (t: string) => mine.includes(t);
  const toggle = useCallback(
    async (t: string) => {
      if (mine.includes(t)) {
        setMine((l) => l.filter((x) => x !== t));
        await supabase.from('interests').delete().eq('user_id', me.id).eq('topic', t);
      } else {
        setMine((l) => [...l, t]);
        await supabase.from('interests').upsert({ user_id: me.id, topic: t, active: true });
      }
    },
    [mine, me.id],
  );

  const q = query.trim().toLowerCase();
  const catalogue = [...new Set([...mine, ...trending.map((t) => t.name), ...allTopics])];
  const hits = q ? catalogue.filter((t) => t.toLowerCase().includes(q)) : [];
  const exact = catalogue.some((t) => t.toLowerCase() === q);
  const newTopic = query.trim().replace(/^./, (c) => c.toUpperCase()).slice(0, 40);
  const suggestions = suggestedInterests.filter((i) => !has(i));

  const row = (name: string, note?: string) => {
    const on = has(name);
    return (
      <Choice key={name} on={on} label={name} onPress={() => toggle(name)}>
        <MintTile icon="compass" />
        <View style={parts.choiceText}>
          <T v="label">{name}</T>
          {!!note && (
            <T v="caption" c={color.textSecondary}>
              {note}
            </T>
          )}
        </View>
        <CheckBox on={on} />
      </Choice>
    );
  };
  const trendNames = new Set(trending.map((t) => t.name));

  return (
    <View style={s.root}>
      <TextField
        label="Søg efter eller tilføj en interesse"
        showLabel={false}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        inputMode="search"
      />

      {q ? (
        <View style={s.section} accessibilityLabel="Søgeresultater">
          {hits.map((h) => row(h))}
          {!exact && newTopic.length >= 2 && (
            <Choice
              on={false}
              label={`Tilføj ${newTopic}`}
              onPress={() => {
                toggle(newTopic);
                setQuery('');
              }}
            >
              <MintTile icon="plus" />
              <View style={parts.choiceText}>
                <T v="label">{`Tilføj “${newTopic}”`}</T>
                <T v="caption" c={color.textSecondary}>
                  Ny interesse
                </T>
              </View>
            </Choice>
          )}
        </View>
      ) : (
        <>
          <View style={s.section}>
            <T v="headingS" accessibilityRole="header">
              Dine interesser
            </T>
            {mine.length ? (
              mine.map((m) => row(m))
            ) : (
              <T v="caption" c={color.textSecondary}>
                Du følger ingen interesser endnu. Søg, eller vælg nedenfor.
              </T>
            )}
          </View>

          {trending.some((t) => !has(t.name)) && (
            <View style={s.section}>
              <T v="headingS" accessibilityRole="header">
                Populært lige nu
              </T>
              {trending.filter((t) => !has(t.name)).map((t) => row(t.name, t.note))}
            </View>
          )}

          {suggestions.some((i) => !trendNames.has(i)) && (
            <View style={s.section}>
              <T v="headingS" accessibilityRole="header">
                Forslag
              </T>
              {suggestions.filter((i) => !trendNames.has(i)).map((i) => row(i))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Arket "Rediger interesser" (fuld højde, mørk hinde) */
export function TopicsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Rediger interesser" dim initialSize="full">
      {open && <TopicsEditor />}
    </Sheet>
  );
}

const s = StyleSheet.create({
  root: { gap: 22, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 10 },
});
