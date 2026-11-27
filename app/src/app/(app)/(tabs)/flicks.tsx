import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { useBlackChrome } from '@/lib/useDarkChrome';
import { reportTabScroll } from '@/components/TabBar';
import { font, layout, tabbarBar, TAP } from '@/theme/tokens';

type Mode = 'interesser' | 'foelger';
const PAGE = 10;

/**
 * Flicks: korte lodrette videoer og billeder i fuld skærm (som i prototypen).
 * Interesser = flicks om dine interesser, Følger = flicks fra dem, du følger. Skift er hårdt (som Reels).
 * ?vis=<id> åbner en bestemt flick først (fx fra en profil).
 */
export default function Flicks() {
  useBlackChrome();
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

  // Safari: videoen går helt ned under browserens bundbjælke (den er gennemsigtig)
  const under = useUnderSafariBar();
  // Tekstpanelet ligger 16 px over bundmenuen
  const bottomInset = tabbarBar(insets.bottom) + 16 + under;
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
    <View style={[s.root, under > 0 && ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: -under } as object)]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
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
          // Telefon: fortæl bundmenuen, at der rulles (den bliver så mindre)
          onScroll={reportTabScroll}
          scrollEventThrottle={32}
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

      {/* Diskrete faner som tekst (fed + streg = valgt) og et lille ikon til at justere interesser */}
      <Pressable accessibilityRole="button" accessibilityLabel="Juster dine interesser" onPress={() => setEditing(true)} style={[s.icon, { top: topInset }]} hitSlop={4}>
        <View style={shadowIcon}>
          <Icon name="sliders" size={22} color="#fff" />
        </View>
      </Pressable>
      {/* Fanerne i midten. Rækken holder sig fri af ⋯ til højre, så den ikke fanger trykket */}
      <View style={[s.top, { top: topInset }]}>
        <View style={s.modes} accessibilityRole="radiogroup" accessibilityLabel="Vælg feed">
          {(['interesser', 'foelger'] as Mode[]).map((m) => {
            const on = mode === m;
            return (
              <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} onPress={() => switchTo(m)} style={s.mode}>
                <T style={[s.modeText, !on && s.modeOff]} c="#fff">
                  {m === 'interesser' ? 'Interesser' : 'Følger'}
                </T>
                <View style={[s.bar, on && s.barOn]} />
              </Pressable>
            );
          })}
        </View>
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

/**
 * Web i Safari: hvor meget af skærmen browserens bundbjælke dækker (forskellen på den store
 * og den synlige skærmhøjde). Flicks fylder så hele skærmen, også bag bjælken.
 */
function useUnderSafariBar() {
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !CSS.supports?.('height', '100lvh')) return;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const measure = () => setExtra(Math.max(0, Math.round(probe.getBoundingClientRect().height - window.innerHeight)));
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      probe.remove();
    };
  }, []);
  return extra;
}

const shadowIcon = (Platform.OS === 'web'
  ? { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))' }
  : { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }) as object;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  // Fanerne står i midten; ⋯ på selve flicken ligger til højre
  top: { position: 'absolute', left: 64, right: 64, height: TAP, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  icon: { position: 'absolute', left: 10, zIndex: 10, width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', gap: 4 },
  mode: { height: TAP, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  modeOff: { opacity: 0.65 },
  bar: { position: 'absolute', bottom: 6, width: 18, height: 2.5, borderRadius: 2, backgroundColor: 'transparent' },
  barOn: { backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  ghost: { minHeight: TAP, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center' },
});
