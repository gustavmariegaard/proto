import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { FlickGrid } from '@/components/FlickGrid';
import { PageHeader } from '@/components/PageHeader';
import { T } from '@/components/T';
import { normalize } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { fmtNumber } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { color } from '@/theme/tokens';

/** Et hashtag på Flicks: hvor mange flicks der er, og alle flicks med tagget (nyeste først) */
export default function FlickTag() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [flicks, setFlicks] = useState<PostCard[] | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!tag) return;
    supabase
      .from('post_cards')
      .select('*', { count: 'exact' })
      .eq('kind', 'flick')
      .contains('tags', [tag])
      .order('created_at', { ascending: false })
      .limit(90)
      .then(({ data, count: n }) => {
        setFlicks(((data ?? []) as PostCard[]).map(normalize));
        setCount(n ?? data?.length ?? 0);
      });
  }, [tag]);

  return (
    <View style={s.root}>
      <PageHeader title={`#${tag}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.head}>
          <T v="bodyS" c={color.textSecondary}>
            {count === null ? ' ' : count === 1 ? '1 flick' : `${fmtNumber(count)} flicks`}
          </T>
        </View>
        {flicks === null ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={color.textPrimary} />
        ) : flicks.length === 0 ? (
          <T v="bodyS" c={color.textSecondary} style={s.empty}>
            Ingen flicks med #{tag} endnu.
          </T>
        ) : (
          <FlickGrid flicks={flicks} />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  head: { paddingHorizontal: 20, paddingBottom: 14, gap: 2 },
  empty: { textAlign: 'center', paddingTop: 24 },
});
