import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { TopBar } from '@/components/TopBar';
import { TopicsSheet } from '@/components/TopicsSheet';
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
  const [editing, setEditing] = useState(false);

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
    <View style={s.head}>
      <T v="titleXl" accessibilityRole="header">
        Offentlig debat
      </T>
      {/* Rediger interesser står først og ruller med væk, når man bladrer i emnerne */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
        style={s.rowWrap}
        accessibilityLabel="Filtrér efter dine interesser"
      >
        <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={({ pressed }) => [s.edit, pressed && { opacity: 0.7 }]}>
          <Icon name="sliders" size={18} />
          <T v="label">Rediger interesser</T>
        </Pressable>
        {interests.map((t) => (
          <Chip
            key={t.topic}
            selected={t.active}
            trailing={t.active ? 'close' : 'plus'}
            style={s.topic}
            onPress={() => toggle(t)}
          >
            {t.topic}
          </Chip>
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
    <Screen edges={[]} scroll={false}>
      <TopBar />
      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => `${p.id}-${tick}`}
        contentContainerStyle={s.list}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 14 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          posts === null ? (
            <ActivityIndicator color={color.textPrimary} style={{ marginTop: 24 }} />
          ) : (
            <T v="bodyS" c={color.textSecondary}>
              Ingen opslag om dine interesser lige nu. Prøv at følge flere.
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
      <TopicsSheet
        open={editing}
        onClose={() => {
          setEditing(false);
          load();
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: TAB_SPACE },
  head: { gap: 14 },
  rowWrap: { marginHorizontal: -20, flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 20 },
  edit: {
    minHeight: TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.bgSurface,
  },
  topic: { paddingLeft: 16, paddingRight: 12 },
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
