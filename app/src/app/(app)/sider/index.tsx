import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { matches, MoreScreen } from '@/components/MoreParts';
import { PageRow } from '@/components/PageRow';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { listPages, type PageCard } from '@/lib/community';
import { isUnread, latestPosts, seenTimes, type Latest } from '@/lib/moreActivity';
import { useMe } from '@/lib/session';
import { color } from '@/theme/tokens';

/** Sider: fulgte sider (og dem, du selv har oprettet) – prototypens Pages */
export default function Pages() {
  const me = useMe();
  const [pages, setPages] = useState<PageCard[] | null>(null);
  const [latest, setLatest] = useState<Record<string, Latest>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const mine = (await listPages()).filter((p) => p.i_follow || p.i_admin);
    const ids = mine.map((p) => p.id);
    const [l, sn] = await Promise.all([latestPosts('page_id', ids), seenTimes(ids)]);
    setPages(mine);
    setLatest(l);
    setSeen(sn);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const lastAt = (p: PageCard) => latest[p.id]?.at ?? p.created_at;
  const shown = (pages ?? []).filter((p) => matches(p.name, query)).sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
  const count = shown.length;

  return (
    <MoreScreen title="Sider" action={{ label: 'Opret side', onPress: () => router.push('/sider/ny') }}>
      <T v="headingM" accessibilityRole="header">
        Fulgte sider
      </T>
      <TextField label="Søg i fulgte sider" showLabel={false} value={query} onChangeText={setQuery} />
      <T v="caption" c={color.textSecondary} accessibilityLiveRegion="polite">
        {`${count} ${count === 1 ? 'side' : 'sider'}`}
      </T>
      {pages === null ? null : shown.length === 0 ? (
        <T v="bodyS" c={color.textSecondary} style={s.empty}>
          {query.trim() ? `Ingen sider matcher “${query.trim()}”.` : 'Du følger ingen sider endnu.'}
        </T>
      ) : (
        <View style={s.list}>
          {shown.map((p) => (
            <PageRow
              key={p.id}
              page={p}
              lastPost={latest[p.id]?.at ?? null}
              unread={isUnread(latest[p.id], seen[p.id], me.id)}
              onOpen={() => setSeen((m) => ({ ...m, [p.id]: Date.now() }))}
            />
          ))}
        </View>
      )}
    </MoreScreen>
  );
}

const s = StyleSheet.create({
  list: { gap: 16 },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
