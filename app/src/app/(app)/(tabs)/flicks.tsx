import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlickCommentsSheet } from '@/components/FlickCommentsSheet';
import { FlickItem } from '@/components/FlickItem';
import { Icon } from '@/components/Icon';
import { T } from '@/components/T';
import { TopicsSheet } from '@/components/TopicsSheet';
import { getPost, normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { useDarkChrome } from '@/lib/useDarkChrome';
import { color, font, layout, radius, tabbarBar, TAP } from '@/theme/tokens';

type Mode = 'interesser' | 'foelger';
const PAGE = 10;

/**
 * Flicks: korte lodrette videoer og billeder i fuld skærm (som i prototypen).
 * Interesser = flicks om dine interesser, Følger = flicks fra dem, du følger. Skift er hårdt (som Reels).
 * ?vis=<id> åbner en bestemt flick først (fx fra en profil).
 */
export default function Flicks() {
  useDarkChrome();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const { vis } = useLocalSearchParams<{ vis?: string }>();
  const [mode, setMode] = useState<Mode>('interesser');
  const [items, setItems] = useState<PostCard[] | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [more, setMore] = useState(true);
  const [editing, setEditing] = useState(false);
  const loadingMore = useRef(false);

  // Tekstpanelet ligger 16 px over bundmenuen
  const bottomInset = tabbarBar(insets.bottom) + 16;
  const topInset = insets.top + layout.topGap;

  const load = useCallback(async (m: Mode) => {
    const [{ data }, { data: ints }] = await Promise.all([
      supabase.rpc('feed_flicks', { mode: m, before: new Date().toISOString(), max_rows: PAGE }),
      supabase.from('interests').select('topic').eq('active', true),
    ]);
    let list = ((data ?? []) as PostCard[]).map(normalize);
    if (vis) {
      const first = list.find((f) => f.id === vis) ?? (await getPost(vis));
      if (first && first.kind === 'flick') list = [normalize(first), ...list.filter((f) => f.id !== vis)];
    }
    setTopics(((ints ?? []) as { topic: string }[]).map((i) => i.topic));
    setItems(list);
    setMore((data ?? []).length === PAGE);
  }, [vis]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      load(mode);
      return () => setFocused(false);
    }, [load, mode]),
  );

  const switchTo = (m: Mode) => {
    if (m === mode) return;
    setItems(null);
    setIndex(0);
    setMode(m);
  };

  const loadMore = async () => {
    if (!items?.length || !more || loadingMore.current) return;
    loadingMore.current = true;
    const { data } = await supabase.rpc('feed_flicks', { mode, before: items[items.length - 1].created_at, max_rows: PAGE });
    const list = ((data ?? []) as PostCard[]).map(normalize);
    setItems((l) => [...(l ?? []), ...list.filter((x) => !l?.some((y) => y.id === x.id))]);
    setMore(list.length === PAGE);
    loadingMore.current = false;
  };

  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null; isViewable: boolean }> }) => {
    const v = viewableItems.find((x) => x.isViewable);
    if (v?.index != null) setIndex(v.index);
  }).current;

  useEffect(() => setIndex(0), [mode]);

  // Antal kommentarer opdateres på flicken, når arket henter dem
  const onCount = useCallback(
    (n: number) => setItems((l) => l?.map((f) => (f.id === commentsFor ? { ...f, comments: n } : f)) ?? null),
    [commentsFor],
  );

  const why = (f: PostCard) => {
    const t = f.tags.find((x) => topics.includes(x));
    if (mode === 'interesser' && t) return `Flicken handler om ${t}, som er en af dine interesser.`;
    if (f.author_id === me.id) return 'Det er din egen flick.';
    return `Du følger ${f.author_name}.`;
  };

  return (
    <View style={s.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <T v="headingM" style={s.hidden} accessibilityRole="header">
        Flicks
      </T>

      {items === null || !height ? (
        <ActivityIndicator style={{ marginTop: '60%' }} color="#fff" />
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <T v="headingM" c="#fff" style={{ textAlign: 'center' }}>
            {mode === 'interesser' ? 'Ingen flicks om dine interesser lige nu' : 'Ingen flicks fra dem, du følger'}
          </T>
          {mode === 'interesser' && (
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={s.ghost}>
              <T v="label" c="#fff">
                Rediger interesser
              </T>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          key={mode}
          data={items}
          keyExtractor={(f) => f.id}
          pagingEnabled
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_d, i) => ({ length: height, offset: height * i, index: i })}
          onViewableItemsChanged={onViewable as never}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={loadMore}
          onEndReachedThreshold={1.5}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          renderItem={({ item, index: i }) => (
            <FlickItem
              flick={item}
              height={height}
              bottomInset={bottomInset}
              topInset={topInset}
              active={focused && i === index && !commentsFor}
              why={why(item)}
              onComments={() => setCommentsFor(item.id)}
              onRemoved={() => setItems((l) => l?.filter((x) => x.id !== item.id) ?? null)}
            />
          )}
        />
      )}

      {/* Justér interesser · Interesser · Følger. Valgt = hvid, resten gennemsigtige. */}
      <View style={[s.top, { top: topInset }]} accessibilityRole="radiogroup" accessibilityLabel="Vælg feed">
        <Pressable accessibilityRole="button" accessibilityLabel="Juster dine interesser" onPress={() => setEditing(true)} style={[s.mode, s.icon]}>
          <Icon name="sliders" size={20} color="#fff" />
        </Pressable>
        {(['interesser', 'foelger'] as Mode[]).map((m) => {
          const on = mode === m;
          return (
            <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => switchTo(m)} style={[s.mode, on && s.modeOn]}>
              <T style={s.modeText} c={on ? color.textPrimary : '#fff'}>
                {m === 'interesser' ? 'Interesser' : 'Følger'}
              </T>
            </Pressable>
          );
        })}
      </View>

      <FlickCommentsSheet
        postId={commentsFor}
        onClose={() => setCommentsFor(null)}
        onCount={onCount}
      />
      <TopicsSheet
        open={editing}
        onClose={() => {
          setEditing(false);
          setItems(null);
          setIndex(0);
          load(mode);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  top: { position: 'absolute', left: 20, flexDirection: 'row', gap: 8, zIndex: 10 },
  mode: {
    height: TAP,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOn: { backgroundColor: color.bgSurface, borderWidth: 1, borderColor: color.borderStrong },
  modeText: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  icon: { width: TAP, paddingHorizontal: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  ghost: { minHeight: TAP, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center' },
});
