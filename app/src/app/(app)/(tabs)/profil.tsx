import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfilePosts } from '@/components/ProfilePosts';
import { postsBy, profileView, type ProfileView } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import type { PostCard } from '@/lib/types';
import { color, TAB_SPACE } from '@/theme/tokens';

/** Din egen profil */
export default function MyProfile() {
  const me = useMe();
  const [view, setView] = useState<ProfileView | null>(null);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [v, p] = await Promise.all([profileView(me.username), postsBy(me.id)]);
    setView(v);
    setPosts(p);
  }, [me.username, me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const header = view ?? { ...me, posts: 0, followers: 0, following: 0 };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.top}>
        <IconButton icon="search" label="Søg efter folk" onPress={() => router.push('/soeg')} />
        <IconButton icon="settings" label="Indstillinger" onPress={() => router.push('/indstillinger')} />
      </View>
      <ScrollView
        contentContainerStyle={s.content}
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
      >
        <ProfileHeader p={{ ...header, posts: posts.filter((x) => x.kind === 'feed').length }}>
          <Button title="Rediger profil" variant="secondary" block onPress={() => router.push('/rediger-profil')} />
        </ProfileHeader>
        <ProfilePosts posts={posts} onChanged={load} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 4 },
  content: { paddingHorizontal: 20, gap: 16, paddingBottom: TAB_SPACE },
});
