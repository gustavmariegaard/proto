import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { allTopics } from '@/lib/topics';
import { color, radius } from '@/theme/tokens';
import { Chip } from './Chip';
import { Icon } from './Icon';
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

  const chip = (i: string) => (
    <Chip key={i} selected={has(i)} trailing={has(i) ? 'close' : 'plus'} style={s.chip} onPress={() => toggle(i)}>
      {i}
    </Chip>
  );

  return (
    <View style={s.root}>
      <TextField
        label="Søg efter interesser"
        showLabel={false}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        inputMode="search"
      />

      {q ? (
        <View style={s.section} accessibilityLabel="Søgeresultater">
          <View style={s.chips}>
            {hits.map(chip)}
            {!exact && (
              <Chip
                trailing="plus"
                style={s.chip}
                onPress={() => {
                  toggle(newTopic);
                  setQuery('');
                }}
              >
                {`Følg “${newTopic}”`}
              </Chip>
            )}
          </View>
          {hits.length === 0 && (
            <T v="caption" c={color.textSecondary}>
              Ingen interesser hedder sådan endnu. Du kan selv følge den.
            </T>
          )}
        </View>
      ) : (
        <>
          <View style={s.section}>
            <T v="headingS" accessibilityRole="header">
              Dine interesser
            </T>
            {mine.length ? (
              <View style={s.chips}>{mine.map(chip)}</View>
            ) : (
              <T v="caption" c={color.textSecondary}>
                Du følger ingen interesser endnu. Søg, eller vælg nedenfor.
              </T>
            )}
          </View>

          {trending.length > 0 && (
            <View style={s.section}>
              <T v="headingS" accessibilityRole="header">
                Trender lige nu
              </T>
              <View>
                {trending.map((t, n) => {
                  const on = has(t.name);
                  return (
                    <Pressable
                      key={t.name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => toggle(t.name)}
                      style={[s.trend, n === trending.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <T v="headingS" c={color.textSecondary} style={s.rank} aria-hidden>
                        {n + 1}
                      </T>
                      <View style={s.trendText}>
                        <T v="label">{t.name}</T>
                        <T v="caption" c={color.textSecondary}>
                          {t.note}
                        </T>
                      </View>
                      <View style={[s.follow, on && s.followOn]}>
                        <Icon name={on ? 'check' : 'plus'} size={14} color={on ? color.textOnAction : color.textPrimary} />
                        <T v="captionStrong" c={on ? color.textOnAction : color.textPrimary}>
                          {on ? 'Følger' : 'Følg'}
                        </T>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={s.section}>
              <T v="headingS" accessibilityRole="header">
                Forslag til dig
              </T>
              <View style={s.chips}>{suggestions.map(chip)}</View>
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
  root: { gap: 20, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32 },
  section: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingLeft: 16, paddingRight: 12 },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.borderDefault,
  },
  rank: { width: 20, textAlign: 'center' },
  trendText: { flex: 1, minWidth: 0 },
  follow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.pill,
  },
  followOn: { borderColor: color.actionPrimary, backgroundColor: color.actionPrimary },
});
