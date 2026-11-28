import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ProfileHeader } from '@/components/ProfileHeader';
import { profilePosts, ProfilePosts } from '@/components/ProfilePosts';
import { PageHeader } from '@/components/PageHeader';
import { TopBar } from '@/components/TopBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activeMoments } from '@/lib/moments';
import { postsBy, profileView, type ProfileView } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import type { PostCard } from '@/lib/types';
import { color, TAB_SPACE } from '@/theme/tokens';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { PageProfile } from '@/components/PageProfile';
import { useActingAs } from '@/lib/actingAs';
import { getPage, type PageCard } from '@/lib/community';

/**
 * Din profil. `back`: åbnet fra et opslag, en kommentar o.l. (ikke fra fanen):
 * så står der en tilbage-pil øverst, der fører tilbage til det, man kom fra.
 */
export function MyProfile({ back = false }: { back?: boolean }) {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ProfileView | null>(null);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [hasMoment, setHasMoment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [switching, setSwitching] = useState(false);
  // Bruger du appen som en af dine sider, viser Profil-fanen siden
  const { acting, refresh: refreshPages } = useActingAs(me.id);
  const asPage = !back && acting.kind === 'side' ? acting : null;
  const [page, setPage] = useState<PageCard | null>(null);

  const load = useCallback(async () => {
    refreshPages();
    if (asPage) {
      setPage(await getPage(asPage.handle));
      return;
    }
    const [v, p, m] = await Promise.all([profileView(me.username), postsBy(me.id), activeMoments(me.id, 'person')]);
    setView(v);
    setPosts(p);
    setHasMoment(m.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.username, me.id, asPage?.handle]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const postCount = profilePosts(posts).length;

  return (
    <View style={s.root}>
      {back ? <PageHeader title="Profil" fallback="/profil" /> : <TopBar />}
      <ScrollView
        contentContainerStyle={[s.content, back && { paddingTop: 4, paddingBottom: 32 + insets.bottom }]}
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
        {asPage ? (
          page && page.id === asPage.id ? <PageProfile key={page.id} page={page} acting onChanged={load} /> : null
        ) : (
          <>
        <ProfileHeader
          me={me}
          onSwitch={() => setSwitching(true)}
          hasMoment={hasMoment}
          onRing={() => (hasMoment ? router.push({ pathname: '/moment/[id]', params: { id: me.id } }) : router.push('/ny-moment'))}
          posts={postCount}
          followers={view?.followers ?? 0}
          following={view?.following ?? 0}
        />
        <ProfilePosts userId={me.id} own name={me.name.split(' ')[0] ?? me.name} posts={posts} onChanged={load} />
          </>
        )}
      </ScrollView>
      <AccountSwitcher open={switching} onClose={() => setSwitching(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { paddingHorizontal: 20, gap: 14, paddingBottom: TAB_SPACE },
});
