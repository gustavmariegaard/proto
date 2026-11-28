import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Choice, parts } from '@/components/CreateParts';
import { MintTile } from '@/components/CreateFlow';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { PageOnlyNotice } from '@/components/PageOnlyNotice';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { useActingAs } from '@/lib/actingAs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
 * Øverst søgefelt og filter-ikon (som Søg og Beskeder). Filteret vælger, hvilke interesser der vises,
 * og "Rediger interesser" tilføjer og fjerner emner. Sider deltager ikke i debatten.
 */
export default function Debate() {
  const me = useMe();
  const { acting } = useActingAs(me.id);
  if (acting.kind === 'side') {
    return (
      <Screen edges={[]} scroll={false}>
        <TopBar />
        <View style={s.pageOnly}>
          <T v="titleXl" accessibilityRole="header">
            Offentlig debat
          </T>
          <PageOnlyNotice
            icon="compass"
            title="Debatten er for personer"
            text="Sider deltager ikke i Offentlig debat. Som side deler du opslag, der vises under Interesser hos dem, der følger siden."
          />
        </View>
      </Screen>
    );
  }
  return <PersonDebate />;
}

function PersonDebate() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
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

  const showAll = async () => {
    setInterests((l) => l.map((x) => ({ ...x, active: true })));
    await supabase.from('interests').update({ active: true }).eq('user_id', me.id);
    load();
  };

  const undoMute = async () => {
    if (!muted) return;
    await muteInDebate(me.id, muted.id, false);
    setMuted(null);
    load();
  };

  const off = interests.filter((t) => !t.active);
  const q = query.trim().toLowerCase();
  const shown = (posts ?? []).filter(
    (p) => !q || p.text.toLowerCase().includes(q) || p.author_name.toLowerCase().includes(q) || p.author_username.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)),
  );

  const header = (
    <View style={s.head}>
      <T v="titleXl" accessibilityRole="header">
        Offentlig debat
      </T>
      {/* Søg og filtrér (samme udtryk som Søg og Beskeder) */}
      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <TextField label="Søg i debatten" showLabel={false} autoCapitalize="none" autoCorrect={false} inputMode="search" value={query} onChangeText={setQuery} />
        </View>
        <IconButton
          icon="sliders"
          label={off.length ? `Filtrér debatten. ${off.length} interesser er skjult` : 'Filtrér debatten'}
          dot={off.length > 0}
          onPress={() => setFilterOpen(true)}
        />
      </View>
      {off.length > 0 && (
        <View style={s.filtered}>
          <T v="caption" c={color.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
            Viser {interests.length - off.length} af {interests.length} interesser
          </T>
          <Pressable accessibilityRole="button" onPress={showAll} hitSlop={8}>
            <T v="captionStrong" style={{ textDecorationLine: 'underline' }}>
              Vis alle
            </T>
          </Pressable>
        </View>
      )}
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
        data={posts === null ? [] : shown}
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
              {q ? `Ingen opslag i debatten matcher “${query.trim()}”.` : 'Ingen opslag om dine interesser lige nu. Prøv at følge flere.'}
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
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Vis opslag om" dim initialSize="auto">
        <View style={[s.filter, { paddingBottom: 16 + insets.bottom }]} accessibilityLabel="Dine interesser">
          {interests.length === 0 && (
            <T v="bodyS" c={color.textSecondary}>
              Du har ingen interesser endnu. Tilføj nogle for at se debatten om dem.
            </T>
          )}
          {interests.map((t) => (
            <Choice key={t.topic} on={t.active} label={t.topic} onPress={() => toggle(t)}>
              <MintTile icon="compass" />
              <View style={parts.choiceText}>
                <T v="label">{t.topic}</T>
              </View>
              <View style={[s.check, t.active && s.checkOn]}>{t.active && <Icon name="check" size={14} color={color.white} stroke={3} />}</View>
            </Choice>
          ))}
          <Button
            variant="secondary"
            icon="edit"
            block
            onPress={() => {
              setFilterOpen(false);
              setEditing(true);
            }}
          >
            Rediger interesser
          </Button>
        </View>
      </Sheet>
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
  pageOnly: { gap: 14, paddingHorizontal: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: -6 },
  filtered: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6, paddingHorizontal: 4 },
  filter: { gap: 10, paddingTop: 8, paddingHorizontal: 16 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: color.textPrimary, borderColor: color.textPrimary },
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
