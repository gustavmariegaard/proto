import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { supabase } from '@/lib/supabase';
import { ago, fmtNumber } from '@/lib/time';
import { color, radius } from '@/theme/tokens';

type Stats = { posts: number; likes: number; comments: number; saves: number; followers: number; new_followers_30d: number; stances: number };
type Top = { id: string; text: string; kind: string; created_at: string; reactions: number };

/** Skaber: dit publikum i samlede tal. Viser aldrig, hvem enkeltpersoner er. */
export default function Creator() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [top, setTop] = useState<Top[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([supabase.rpc('creator_stats'), supabase.rpc('creator_top_posts', { max_rows: 5 })]).then(([a, b]) => {
        const r = (a.data as Record<string, number>[] | null)?.[0];
        if (r) setStats(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as Stats);
        setTop(((b.data ?? []) as Top[]).map((t) => ({ ...t, reactions: Number(t.reactions) })));
      });
    }, []),
  );

  const tiles: [string, number | undefined][] = [
    ['Følgere', stats?.followers],
    ['Nye følgere (30 dage)', stats?.new_followers_30d],
    ['Opslag', stats?.posts],
    ['Hjerter', stats?.likes],
    ['Kommentarer', stats?.comments],
    ['Gemt', stats?.saves],
    ['Enig/uenig', stats?.stances],
  ];

  return (
    <Screen title="Skaber">
      <T v="caption" c={color.textSecondary}>
        Du ser kun samlede tal. Vi viser aldrig, hvem enkeltpersoner er.
      </T>
      <View style={s.grid}>
        {tiles.map(([label, n]) => (
          <View key={label} style={s.tile}>
            <T v="titleL">{n === undefined ? '–' : fmtNumber(n)}</T>
            <T v="caption" c={color.textSecondary}>
              {label}
            </T>
          </View>
        ))}
      </View>

      <T v="headingM">Dine mest populære opslag</T>
      {top.length === 0 ? (
        <T v="bodyS" c={color.textSecondary}>
          Du har ikke delt noget endnu.
        </T>
      ) : (
        <View style={{ gap: 8 }}>
          {top.map((p, i) => (
            <Pressable key={p.id} accessibilityRole="link" onPress={() => router.push(`/opslag/${p.id}`)} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
              <T v="headingS" c={color.textSecondary} style={{ width: 20 }}>
                {i + 1}
              </T>
              <View style={{ flex: 1 }}>
                <T v="bodyS" numberOfLines={2}>
                  {p.text || 'Billede'}
                </T>
                <T v="caption" c={color.textSecondary}>
                  {p.kind === 'debat' ? 'Debat' : p.kind === 'flick' ? 'Flick' : 'Opslag'} · {ago(p.created_at)}
                </T>
              </View>
              <T v="headingS">{fmtNumber(p.reactions)}</T>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, gap: 2, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
});
