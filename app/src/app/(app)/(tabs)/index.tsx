import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, RefreshControl, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Chip } from '@/components/Chip';
import { MomentBubble } from '@/components/MomentBubble';
import { PostCard } from '@/components/PostCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { TopBar } from '@/components/TopBar';
import { pageRings, personRings, type Ring } from '@/lib/moments';
import { normalize } from '@/lib/posts';
import { readCache, readCacheSync, writeCache } from '@/lib/cache';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, TAB_SPACE } from '@/theme/tokens';

const PAGE = 20;
type Feed = 'venner' | 'interesser';
/** Brugere/Interesser-vælgeren: 52 høj + 8 luft under (prototypens .home__switch) */
const SWITCH_H = 58;

/** Hjem: feed fra dem, du følger, eller fra dine interesser (prototypens Home). */
export default function Home() {
  const me = useMe();
  const params = useLocalSearchParams<{ feed?: string }>();
  const [feed, setFeed] = useState<Feed>(params.feed === 'interesser' ? 'interesser' : 'venner');
  // Sidst viste feed vises med det samme ved åbning og opdateres i baggrunden
  const cacheKey = (f: Feed) => `home.${me.id}.${f}`;
  const initial = readCacheSync<{ posts: Post[]; rings: Ring[] }>(cacheKey(feed));
  const [posts, setPosts] = useState<Post[] | null>(initial?.posts ?? null);
  const [rings, setRings] = useState<Ring[]>(initial?.rings ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(true);
  const loadingMore = useRef(false);
  const rpc = feed === 'interesser' ? 'feed_interests' : 'feed_home';

  // Vælgeren glider væk, når man ruller ned, og kommer igen, når man ruller op
  const hide = useRef(new Animated.Value(0)).current;
  const hidden = useRef(false);
  const last = useRef(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const top = e.nativeEvent.contentOffset.y;
    const delta = top - last.current;
    if (Math.abs(delta) < 6) return;
    const h = delta > 0 && top > 120;
    last.current = top;
    if (h === hidden.current) return;
    hidden.current = h;
    Animated.timing(hide, { toValue: h ? 1 : 0, duration: 250, useNativeDriver: false }).start();
  };

  const load = useCallback(async () => {
    const [{ data }, r] = await Promise.all([
      supabase.rpc(rpc, { before: new Date().toISOString(), max_rows: PAGE }),
      feed === 'interesser' ? pageRings() : personRings(),
    ]);
    const list = ((data ?? []) as Post[]).map(normalize);
    setPosts(list);
    setRings(r);
    setMore(list.length === PAGE);
    writeCache(cacheKey(feed), { posts: list, rings: r });
  }, [rpc, feed, me.id]);

  // Telefon: gemt feed læses asynkront (web har det allerede fra første billede)
  useEffect(() => {
    if (posts !== null) return;
    readCache<{ posts: Post[]; rings: Ring[] }>(cacheKey(feed)).then((c) => {
      if (!c) return;
      setPosts((p) => p ?? c.posts);
      setRings((r) => (r.length ? r : c.rings));
    });
  }, [feed]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchFeed = (f: Feed) => {
    if (f === feed) return;
    const c = readCacheSync<{ posts: Post[]; rings: Ring[] }>(cacheKey(f));
    setPosts(c?.posts ?? null);
    setRings(c?.rings ?? []);
    setFeed(f);
    router.setParams({ feed: f === 'interesser' ? 'interesser' : undefined });
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

  // Nye moments først, sete bagefter
  const myRing = rings.find((r) => r.mine);
  const others = rings.filter((r) => !r.mine).sort((a, b) => Number(!a.unseen) - Number(!b.unseen));
  const queue = (myRing ? [myRing, ...others] : others).map((r) => `${r.kind}:${r.id}`).join(',');
  const open = (r: Ring) => router.push({ pathname: '/moment/[id]', params: { id: r.id, type: r.kind, raekke: queue } });

  const header = (
    <View style={s.header}>
      {feed === 'interesser' && (
        <View style={s.pages}>
          <T v="caption" c={color.textSecondary}>
            Nyt fra de sider, du følger
          </T>
          <Chip icon="layout-grid" style={s.edit} onPress={() => router.push('/sider')}>
            Dine sider
          </Chip>
        </View>
      )}
      {/* Brugere: personers moments med "Dig" først. Interesser: moments fra sider, man følger. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.moments}
        contentContainerStyle={s.momentsContent}
        accessibilityLabel={feed === 'interesser' ? 'Moments fra sider' : 'Moments'}
      >
        {feed === 'venner' && (
          <MomentBubble
            name="Dig"
            fullName={me.name || 'Dig'}
            // Har du et aktivt moment, får "Dig" ringen (som på profilen) – plusset bliver
            state={myRing ? 'new' : 'add'}
            plus
            path={me.avatar_path}
            onPress={() => (myRing ? open(myRing) : router.push('/ny-moment'))}
            onPlus={() => router.push('/ny-moment')}
          />
        )}
        {others.map((r) => (
          <MomentBubble
            key={r.id}
            name={r.handle}
            fullName={r.name}
            path={r.avatar_path}
            state={r.unseen ? 'new' : 'seen'}
            onPress={() => open(r)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={s.root}>
      <TopBar />
      <View style={{ flex: 1 }}>
        <FlatList
          data={posts ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} onRemoved={() => setPosts((l) => l?.filter((x) => x.id !== item.id) ?? null)} />}
          ListHeaderComponent={header}
          ListHeaderComponentStyle={{ marginBottom: 14 }}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            posts === null ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={color.textPrimary} />
            ) : (
              <T v="bodyS" c={color.textSecondary} style={s.empty}>
                {feed === 'interesser' ? 'Ingen opslag fra dine sider endnu.' : 'Ingen opslag endnu.'}
              </T>
            )
          }
        />
        <Animated.View
          pointerEvents="box-none"
          style={[
            s.switch,
            {
              opacity: hide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateY: hide.interpolate({ inputRange: [0, 1], outputRange: [0, -SWITCH_H * 1.1] }) }],
            },
          ]}
        >
          <SegmentedControl
            glass
            label="Vis opslag fra"
            value={feed}
            onChange={switchFeed}
            options={[
              { value: 'venner', label: 'Brugere' },
              { value: 'interesser', label: 'Interesser' },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  list: { paddingHorizontal: 20, paddingTop: SWITCH_H + 14, paddingBottom: TAB_SPACE },
  header: { gap: 14 },
  switch: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, zIndex: 5 },
  pages: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  edit: { gap: 6, paddingHorizontal: 14 },
  moments: { marginHorizontal: -20 },
  momentsContent: { gap: 12, paddingHorizontal: 20, paddingBottom: 2 },
  empty: { textAlign: 'center', paddingTop: 24 },
});
