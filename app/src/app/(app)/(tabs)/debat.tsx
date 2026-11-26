import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/Chip';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { muteInDebate, normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, radius, TAB_SPACE, TAP } from '@/theme/tokens';

type Interest = { topic: string; active: boolean };

/**
 * Offentlig debat: opslag om dine interesser.
 * Interesserne er filtre (✕ slår fra, + slår til). "Rediger interesser" tilføjer og fjerner.
 */
export default function Debate() {
  const me = useMe();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [muted, setMuted] = useState<{ id: string; name: string } | null>(null);
  // Skifter ved hver indlæsning, så kortene (stemmer og noter) hentes på ny, når man kommer tilbage
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const [{ data: i }, { data: p }] = await Promise.all([
      supabase.from('interests').select('topic, active').eq('user_id', me.id).order('topic'),
      supabase.rpc('feed_debate', { before: new Date().toISOString(), max_rows: 50 }),
    ]);
    setInterests((i ?? []) as Interest[]);
    setPosts(((p ?? []) as Post[]).map(normalize));
    setTick((t) => t + 1);
  }, [me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (t: Interest) => {
    setInterests((l) => l.map((x) => (x.topic === t.topic ? { ...x, active: !x.active } : x)));
    await supabase.from('interests').update({ active: !t.active }).eq('user_id', me.id).eq('topic', t.topic);
    load();
  };

  const undoMute = async () => {
    if (!muted) return;
    await muteInDebate(me.id, muted.id, false);
    setMuted(null);
    load();
  };

  const header = (
    <View style={{ gap: 16 }}>
      <T v="titleXl" accessibilityRole="header">
        Offentlig debat
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row} style={s.rowWrap}>
        <Chip label="Rediger interesser" icon="sliders" onPress={() => router.push('/interesser')} />
        {interests.map((t) => (
          <Chip
            key={t.topic}
            label={t.topic}
            selected={t.active}
            trailing={t.active ? 'close' : 'plus'}
            onPress={() => toggle(t)}
          />
        ))}
      </ScrollView>
      {muted && (
        <View style={s.notice} accessibilityRole="alert">
          <T v="bodyS" style={{ flex: 1 }}>
            Du ser ikke længere opslag fra {muted.name} i debatten.
          </T>
          <Pressable accessibilityRole="button" onPress={undoMute} style={s.undo}>
            <T v="captionStrong" style={{ textDecorationLine: 'underline' }}>
              Fortryd
            </T>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <Screen edges={['top']} scroll={false}>
      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => `${p.id}-${tick}`}
        contentContainerStyle={s.list}
        ListHeaderComponent={header}
        ListEmptyComponent={
          posts === null ? (
            <ActivityIndicator color={color.textPrimary} style={{ marginTop: 24 }} />
          ) : (
            <T v="bodyS" c={color.textSecondary}>
              Ingen opslag om dine interesser lige nu.
            </T>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onRemoved={(why) => {
              if (why === 'muted') {
                setPosts((l) => (l ?? []).filter((p) => p.author_id !== item.author_id));
                setMuted({ id: item.author_id, name: item.author_name });
              } else setPosts((l) => (l ?? []).filter((p) => p.id !== item.id));
            }}
          />
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { padding: 20, paddingTop: 8, gap: 16, paddingBottom: TAB_SPACE },
  rowWrap: { marginHorizontal: -20 },
  row: { gap: 8, paddingHorizontal: 20 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  undo: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: 12 },
});
