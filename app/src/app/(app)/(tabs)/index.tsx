import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { normalize } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { useUnread } from '@/lib/unread';
import { color, TAB_SPACE } from '@/theme/tokens';

const PAGE = 20;

/** Hjem: dine egne opslag og dem fra folk, du følger – nyeste først */
export default function Home() {
  const unread = useUnread();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(true);
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('feed_home', { before: new Date().toISOString(), max_rows: PAGE });
    const list = ((data ?? []) as Post[]).map(normalize);
    setPosts(list);
    setMore(list.length === PAGE);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!posts?.length || !more || loadingMore.current) return;
    loadingMore.current = true;
    const { data } = await supabase.rpc('feed_home', { before: posts[posts.length - 1].created_at, max_rows: PAGE });
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

  return (
    <Screen scroll={false} edges={['top']}>
      <View style={s.top}>
        <T v="titleXl" accessibilityRole="header">
          ciircle
        </T>
        <View style={s.icons}>
          <IconButton icon="search" label="Søg" onPress={() => router.push('/soeg')} />
          <IconButton icon="chat" label="Beskeder" dot={unread.messages > 0} onPress={() => router.push('/beskeder')} />
          <IconButton icon="bell" label="Notifikationer" dot={unread.notifications > 0} onPress={() => router.push('/notifikationer')} />
        </View>
      </View>
      {posts === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={color.textPrimary} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} onRemoved={() => setPosts((l) => l?.filter((x) => x.id !== item.id) ?? null)} />}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={s.empty}>
              <T v="headingM">Her er stille</T>
              <T v="bodyS" c={color.textSecondary}>
                Følg folk for at se deres opslag.
              </T>
              <Button title="Find folk" onPress={() => router.push('/soeg')} />
            </View>
          }
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  icons: { flexDirection: 'row', gap: 4 },
  list: { padding: 20, paddingTop: 8, paddingBottom: TAB_SPACE },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
});
