import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { T } from '@/components/T';
import { imageSource } from '@/lib/media';
import { normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, font, radius, TAP } from '@/theme/tokens';

type Tab = 'alt' | 'opslag' | 'flick';

const tabs: { value: Tab; label: string }[] = [
  { value: 'alt', label: 'Alt' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'flick', label: 'Flicks' },
];

/** Gemt (prototypens Saved): det, du har gemt, i et stramt gitter af kvadratiske felter. */
export default function Saved() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [tab, setTab] = useState<Tab>('alt');
  const [w, setW] = useState(0);
  const cellW = w ? Math.floor(((w - 8) / 2) * 100) / 100 : 0;

  const load = useCallback(async () => {
    const { data: saves } = await supabase.from('saves').select('post_id, created_at').eq('user_id', me.id).order('created_at', { ascending: false });
    const ids = (saves ?? []).map((s) => s.post_id as string);
    if (!ids.length) return setPosts([]);
    const { data } = await supabase.from('post_cards').select('*').in('id', ids);
    const byId = new Map(((data ?? []) as Post[]).map((p) => [p.id, normalize(p)]));
    setPosts(ids.map((id) => byId.get(id)).filter((p): p is Post => !!p));
  }, [me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const shown = (posts ?? []).filter((p) => tab === 'alt' || (tab === 'flick' ? p.kind === 'flick' : p.kind !== 'flick'));

  return (
    <View style={s.root}>
      <PageHeader title="Gemt" fallback="/" />
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]}>
        <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="Vis gemte">
          {tabs.map((t) => {
            const on = t.value === tab;
            return (
              <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t.value)} style={s.tab}>
                <T v="label" c={on ? color.textPrimary : color.textSecondary}>
                  {t.label}
                </T>
                <View style={[s.bar, on && s.barOn]} />
              </Pressable>
            );
          })}
        </View>

        <T v="caption" c={color.textSecondary}>
          Kun du kan se det, du har gemt.
        </T>

        {posts?.length === 0 && (
          <T v="bodyS" c={color.textSecondary}>
            Du har ikke gemt noget endnu.
          </T>
        )}

        <View style={s.grid} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {shown.map((p) => {
            const img = p.image_paths[0];
            const label = p.kind === 'flick' ? 'Flick' : `Opslag fra ${p.author_name}`;
            const open = () => router.push(p.kind === 'flick' ? `/flicks?vis=${p.id}` : `/opslag/${p.id}`);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="link"
                accessibilityLabel={label}
                onPress={open}
                style={({ pressed }) => [s.tile, cellW ? { width: cellW } : s.half, !img && s.textTile, pressed && { opacity: 0.9 }]}
              >
                {img && p.media_type === 'video' ? (
                  <View style={[StyleSheet.absoluteFill, s.video]}>
                    <Icon name="clip" color={color.white} />
                  </View>
                ) : img ? (
                  <Image source={imageSource(img)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                ) : (
                  <>
                    <T style={s.text} c={color.accentNoteText} numberOfLines={5}>
                      {p.text}
                    </T>
                    <T v="caption" c={color.accentNoteText} style={{ opacity: 0.8 }} numberOfLines={1}>
                      {p.author_name}
                    </T>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20 },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 22, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  tab: { minHeight: TAP, paddingTop: 8, gap: 8, alignItems: 'center' },
  bar: { alignSelf: 'stretch', height: 3, borderRadius: 2 },
  barOn: { backgroundColor: color.accentHighlight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { width: '48%' },
  tile: { aspectRatio: 1, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  textTile: { justifyContent: 'space-between', gap: 8, padding: 14, backgroundColor: color.accentNoteBg },
  text: { fontFamily: font.title, fontSize: 15, lineHeight: 20 },
  video: { backgroundColor: color.ink900, alignItems: 'center', justifyContent: 'center' },
});
