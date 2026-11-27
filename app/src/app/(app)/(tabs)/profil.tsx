import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { ProfileHeader } from '@/components/ProfileHeader';
import { profilePosts, ProfilePosts } from '@/components/ProfilePosts';
import { TopBar } from '@/components/TopBar';
import { activeMoments } from '@/lib/moments';
import { postsBy, profileView, type ProfileView } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import type { PostCard } from '@/lib/types';
import { color, TAB_SPACE } from '@/theme/tokens';

/** Din profil (prototypens Profile): highlights og fanerne Opslag · Debat · Flicks */
export default function MyProfile() {
  const me = useMe();
  const [view, setView] = useState<ProfileView | null>(null);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [hasMoment, setHasMoment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [v, p, m] = await Promise.all([profileView(me.username), postsBy(me.id), activeMoments(me.id, 'person')]);
    setView(v);
    setPosts(p);
    setHasMoment(m.length > 0);
  }, [me.username, me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const postCount = profilePosts(posts).length;

  return (
    <View style={s.root}>
      <TopBar />
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
        <ProfileHeader
          me={me}
          hasMoment={hasMoment}
          onRing={() => (hasMoment ? router.push({ pathname: '/moment/[id]', params: { id: me.id } }) : router.push('/ny-moment'))}
          posts={postCount}
          followers={view?.followers ?? 0}
          following={view?.following ?? 0}
        />
        <Button variant="secondary" block onPress={() => router.push('/rediger-profil')}>
          Rediger profil
        </Button>
        <ProfilePosts userId={me.id} own name={me.name.split(' ')[0] ?? me.name} posts={posts} onChanged={load} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { paddingHorizontal: 20, gap: 14, paddingBottom: TAB_SPACE },
});
