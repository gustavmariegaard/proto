import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { getPage, postsWhere, setFollowPage, type PageCard } from '@/lib/community';
import { useMe } from '@/lib/session';
import type { PostCard as Post } from '@/lib/types';
import { color } from '@/theme/tokens';

/** En side: billede, navn, kategori, beskrivelse, følg og sidens opslag */
export default function PageView() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const me = useMe();
  const [page, setPage] = useState<PageCard | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);

  const load = useCallback(async () => {
    const p = await getPage(handle);
    setPage(p);
    if (p) setPosts(await postsWhere('page_id', p.id));
  }, [handle]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (page === undefined) return <Screen title="Side">{null}</Screen>;
  if (page === null)
    return (
      <Screen title="Side">
        <T v="bodyS" c={color.textSecondary}>
          Siden findes ikke.
        </T>
      </Screen>
    );

  const toggle = async () => {
    setPage({ ...page, i_follow: !page.i_follow, followers: page.followers + (page.i_follow ? -1 : 1) });
    await setFollowPage(page.id, me.id, !page.i_follow);
  };

  return (
    <Screen title="Side">
      <View style={s.head}>
        <Avatar name={page.name} path={page.avatar_path} size={96} />
        <T v="titleL" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {page.name}
        </T>
        <T v="caption" c={color.textSecondary}>
          {[page.category, `@${page.handle}`].filter(Boolean).join(' · ')}
        </T>
        {!!page.bio && (
          <T v="bodyS" style={{ textAlign: 'center' }}>
            {page.bio}
          </T>
        )}
        <T v="label">
          {page.followers} {page.followers === 1 ? 'følger' : 'følgere'}
        </T>
      </View>
      {page.i_admin ? (
        <Button title="Skriv som siden" icon="edit" block onPress={() => router.push(`/opret?side=${page.id}`)} />
      ) : (
        <Button title={page.i_follow ? 'Følger' : 'Følg'} variant={page.i_follow ? 'secondary' : 'primary'} icon={page.i_follow ? 'check' : undefined} block onPress={toggle} />
      )}
      <View style={{ gap: 12 }}>
        <T v="headingM" accessibilityRole="header">
          Opslag
        </T>
        {posts.length ? (
          posts.map((p) => <PostCard key={p.id} post={p} onRemoved={() => setPosts((l) => l.filter((x) => x.id !== p.id))} />)
        ) : (
          <T v="caption" c={color.textSecondary}>
            Ingen opslag endnu.
          </T>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({ head: { alignItems: 'center', gap: 6, paddingTop: 4 } });
