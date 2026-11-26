import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { IconButton } from '@/components/IconButton';
import { PostCard } from '@/components/PostCard';
import { PostGrid } from '@/components/PostGrid';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color } from '@/theme/tokens';

/** Gemte opslag: kvadratisk gitter eller liste */
export default function Saved() {
  const me = useMe();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [grid, setGrid] = useState(true);

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

  return (
    <Screen
      title="Gemt"
      right={
        posts?.length ? (
          <IconButton icon={grid ? 'layout-rows' : 'layout-grid'} label={grid ? 'Vis som liste' : 'Vis som gitter'} onPress={() => setGrid(!grid)} />
        ) : undefined
      }
    >
      {posts?.length === 0 && (
        <T v="bodyS" c={color.textSecondary}>
          Du har ikke gemt noget endnu.
        </T>
      )}
      {posts && posts.length > 0 &&
        (grid ? (
          <PostGrid posts={posts} />
        ) : (
          <View style={{ gap: 12 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onRemoved={load} />
            ))}
          </View>
        ))}
    </Screen>
  );
}
