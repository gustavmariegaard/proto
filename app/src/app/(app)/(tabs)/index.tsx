import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { MomentRing } from '@/components/MomentRing';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { T } from '@/components/T';
import { TopBar } from '@/components/TopBar';
import { pageRings, personRings, type Ring } from '@/lib/moments';
import { normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, TAB_SPACE } from '@/theme/tokens';

const PAGE = 20;
type Feed = 'brugere' | 'interesser';

/**
 * Hjem (som i prototypen): Brugere = dig, dem du følger og dine grupper.
 * Interesser = sider, du følger. Øverst moments: personers under Brugere, siders under Interesser.
 */
export default function Home() {
  const me = useMe();
  const params = useLocalSearchParams<{ feed?: string }>();
  const [feed, setFeed] = useState<Feed>(params.feed === 'interesser' ? 'interesser' : 'brugere');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [rings, setRings] = useState<Ring[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(true);
  const loadingMore = useRef(false);
  const rpc = feed === 'interesser' ? 'feed_interests' : 'feed_home';

  const load = useCallback(async () => {
    const [{ data }, r] = await Promise.all([
      supabase.rpc(rpc, { before: new Date().toISOString(), max_rows: PAGE }),
      feed === 'interesser' ? pageRings() : personRings(),
    ]);
    const list = ((data ?? []) as Post[]).map(normalize);
    setPosts(list);
    setRings(r);
    setMore(list.length === PAGE);
  }, [rpc, feed]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchFeed = (f: Feed) => {
    if (f === feed) return;
    setPosts(null);
    setRings([]);
    setFeed(f);
  };

  const loadMore = async () => {
    if (!posts?.length || !more || loadingMore.current) return;
    loadingMore.current = true;
    const { data } = await supabase.rpc(rpc, { before: posts[posts.length - 1].created_at, max_rows: PAGE });
    const list = ((data ?? []) as Post[]).map(normalize);
    setPosts((p) => [...(p ?? []), ...list.filter((x) => !p?.some((y) => y.id === x.id))]);
    setMore(list.length === PAGE);
    loadingMore.current = false;
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Rækken, viseren går igennem: dig (hvis du har moments) og så de andre i samme rækkefølge
  const myRing = rings.find((r) => r.mine);
  const others = rings.filter((r) => !r.mine);
  const queue = rings.map((r) => `${r.kind}:${r.id}`).join(',');
  const open = (r: Ring) => router.push({ pathname: '/moment/[id]', params: { id: r.id, type: r.kind, raekke: queue } });

  const header = (
    <View style={{ gap: 12 }}>
      <Segmented
        label="Vælg feed"
        value={feed}
        onChange={switchFeed}
        options={[
          { value: 'brugere', label: 'Brugere' },
          { value: 'interesser', label: 'Interesser' },
        ]}
      />
      {(feed === 'brugere' || others.length > 0) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rings} accessibilityLabel={feed === 'interesser' ? 'Moments fra sider' : 'Moments'}>
          {feed === 'brugere' && (
            <MomentRing
              name={me.name}
              label="Dig"
              avatarPath={me.avatar_path}
              state={myRing ? 'seen' : 'none'}
              plus
              onPress={() => (myRing ? open(myRing) : router.push('/ny-moment'))}
              onPlus={() => router.push('/ny-moment')}
            />
          )}
          {others.map((r) => (
            <MomentRing key={r.id} name={r.name} label={r.kind === 'side' ? r.name : r.handle} avatarPath={r.avatar_path} state={r.unseen ? 'unseen' : 'seen'} onPress={() => open(r)} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Screen scroll={false} edges={[]}>
      <TopBar />
      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} onRemoved={() => setPosts((l) => l?.filter((x) => x.id !== item.id) ?? null)} />}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 14 }}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          posts === null ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={color.textPrimary} />
          ) : feed === 'interesser' ? (
            <View style={s.empty}>
              <T v="headingM">Ingen sider endnu</T>
              <T v="bodyS" c={color.textSecondary}>
                Følg sider for at se deres opslag.
              </T>
              <Button title="Find sider" onPress={() => router.push('/sider')} />
            </View>
          ) : (
            <View style={s.empty}>
              <T v="headingM">Her er stille</T>
              <T v="bodyS" c={color.textSecondary}>
                Følg folk for at se deres opslag.
              </T>
              <Button title="Find folk" onPress={() => router.push('/soeg')} />
            </View>
          )
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { padding: 20, paddingTop: 8, paddingBottom: TAB_SPACE },
  rings: { gap: 6, paddingRight: 8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 40 },
});
