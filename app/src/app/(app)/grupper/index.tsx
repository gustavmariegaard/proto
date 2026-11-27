import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GroupRow } from '@/components/GroupRow';
import { CommunityRow, InitialsAvatar, MoreCard, MoreScreen, MoreTabs, SortRow, matches, whenText, type SortMode } from '@/components/MoreParts';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { listGroups, type GroupCard } from '@/lib/community';
import { isUnread, latestPosts, markSeen, seenTimes, type Latest } from '@/lib/moreActivity';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

type Tab = 'grupper' | 'aktivitet';
type Activity = { id: string; text: string; created_at: string; group_id: string; group_name: string | null; group_avatar_path: string | null };

/** Grupper: Dine grupper og Din aktivitet (prototypens Groups / GroupActivity) */
export default function Groups() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('grupper');
  const [groups, setGroups] = useState<GroupCard[] | null>(null);
  const [latest, setLatest] = useState<Record<string, Latest>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('seneste');

  const load = useCallback(async () => {
    const all = await listGroups();
    // Dine grupper: medlem, inviteret eller anmodet
    const mine = all.filter((g) => g.my_status);
    const ids = mine.map((g) => g.id);
    const [l, sn, act] = await Promise.all([
      latestPosts('group_id', ids),
      seenTimes(ids),
      supabase
        .from('post_cards')
        .select('id, text, created_at, group_id, group_name, group_avatar_path')
        .eq('author_id', me.id)
        .not('group_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
    setGroups(mine);
    setLatest(l);
    setSeen(sn);
    setActivity((act.data ?? []) as Activity[]);
  }, [me.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const lastAt = (g: GroupCard) => latest[g.id]?.at ?? g.created_at;
  const filtered = (groups ?? []).filter((g) => matches(g.name, query));
  const shown =
    sort === 'navn' ? [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'da')) : [...filtered].sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
  const count = shown.length;

  return (
    <MoreScreen title="Grupper" action={{ label: 'Opret gruppe', onPress: () => router.push('/grupper/ny') }}>
      <MoreTabs
        label="Grupper"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'grupper', label: 'Dine grupper' },
          { value: 'aktivitet', label: 'Din aktivitet' },
        ]}
      />
      {tab === 'grupper' ? (
        <>
          <TextField label="Søg i dine grupper" showLabel={false} value={query} onChangeText={setQuery} />
          <SortRow count={`${count} ${count === 1 ? 'gruppe' : 'grupper'}`} sort={sort} onSort={setSort} />
          {groups === null ? null : shown.length === 0 ? (
            <T v="bodyS" c={color.textSecondary} style={s.empty}>
              {query.trim() ? `Ingen grupper matcher “${query.trim()}”.` : 'Du er ikke med i nogen grupper endnu.'}
            </T>
          ) : (
            <View style={s.list}>
              {shown.map((g) =>
                g.my_status === 'medlem' ? (
                  <GroupRow
                    key={g.id}
                    group={g}
                    lastPost={latest[g.id]?.at ?? null}
                    unread={isUnread(latest[g.id], seen[g.id], me.id)}
                    onOpen={() => setSeen((m) => ({ ...m, [g.id]: Date.now() }))}
                  />
                ) : (
                  <CommunityRow
                    key={g.id}
                    name={g.name}
                    path={g.avatar_path}
                    meta={g.my_status === 'inviteret' ? 'Du er inviteret' : 'Anmodning sendt'}
                    unread={g.my_status === 'inviteret'}
                    onPress={() => {
                      markSeen(g.id);
                      router.push(`/grupper/${g.id}`);
                    }}
                  />
                ),
              )}
            </View>
          )}
        </>
      ) : (
        <>
          <T v="bodyS" c={color.textSecondary}>
            Opslag, du har lavet i dine grupper
          </T>
          {activity?.length === 0 && (
            <T v="bodyS" c={color.textSecondary} style={s.empty}>
              Du har ikke skrevet i nogen grupper endnu.
            </T>
          )}
          <View style={s.cards}>
            {activity?.map((a) => (
              <MoreCard key={a.id} label={a.group_name ?? 'Gruppe'} onPress={() => router.push(`/opslag/${a.id}`)}>
                <View style={s.cardRow}>
                  <InitialsAvatar name={a.group_name ?? 'Gruppe'} path={a.group_avatar_path} size="S" />
                  <View style={s.cardText}>
                    <T v="headingS" numberOfLines={1}>
                      {a.group_name}
                    </T>
                    <T v="caption" c={color.textSecondary} numberOfLines={1}>
                      Du skrev {whenText(a.created_at)}
                    </T>
                  </View>
                </View>
                {!!a.text && <T v="bodyS">{a.text}</T>}
              </MoreCard>
            ))}
          </View>
        </>
      )}
    </MoreScreen>
  );
}

const s = StyleSheet.create({
  list: { gap: 16 },
  cards: { gap: 14 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardText: { flex: 1, minWidth: 0, gap: 1 },
});
