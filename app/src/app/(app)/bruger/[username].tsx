import { MyProfile } from '@/components/MyProfile';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileBadge, ProfileCard } from '@/components/ProfileCard';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { profilePosts, ProfilePosts } from '@/components/ProfilePosts';
import { T } from '@/components/T';
import { UserMenu } from '@/components/UserMenu';
import { activeMoments } from '@/lib/moments';
import { trackVisit } from '@/lib/insights';
import { follow, postsBy, profileView, unfollow, type ProfileView } from '@/lib/profiles';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard } from '@/lib/types';
import { color, radius } from '@/theme/tokens';

const publicLabel = { person: 'Offentlig person', side: 'Side' } as const;

/**
 * En andens profil (prototypens UserProfile): billede, navn, @brugernavn,
 * følg-knap og hele deres historik af opslag. Rute: /bruger/:username
 */
export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const me = useMe();
  // Din egen profil, åbnet fra et opslag o.l.: med tilbage-pil til det, du kom fra
  if (username === me.username) return <MyProfile back />;
  return <UserProfile />;
}

function UserProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<ProfileView | null | undefined>(undefined);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [moments, setMoments] = useState<{ any: boolean; seen: boolean }>({ any: false, seen: true });
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    const v = await profileView(username);
    setP(v);
    if (v) trackVisit(v.id, me.id);
    if (!v || v.i_blocked) {
      setPosts([]);
      setMoments({ any: false, seen: true });
      return;
    }
    const [list, ms] = await Promise.all([postsBy(v.id), activeMoments(v.id, 'person')]);
    setPosts(list);
    setMoments({ any: ms.length > 0, seen: ms.every((m) => m.seen) });
  }, [username, me.username]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!p) {
    return (
      <View style={s.root}>
        <PageHeader title="Profil" fallback="/" />
        <View style={s.content}>
          {p === undefined ? (
            <ActivityIndicator color={color.textPrimary} />
          ) : (
            <T v="bodyS" c={color.textSecondary}>
              Profilen findes ikke.
            </T>
          )}
        </View>
      </View>
    );
  }

  const first = p.name.split(' ')[0] ?? p.name;
  const following = p.my_follow === 'accepted';
  const blocked = p.i_blocked;
  // Privat profil, du ikke følger: kun tallet fra databasen (opslagene kan ikke ses)
  const postCount = p.can_see ? profilePosts(posts).length : p.posts + p.debate_posts;

  const toggleFollow = async () => {
    setBusy(true);
    if (p.my_follow) await unfollow(me.id, p.id);
    else await follow(me.id, p.id);
    await load();
    setBusy(false);
  };

  const message = async () => {
    const { data, error } = await supabase.rpc('start_conversation', { member_ids: [p.id] });
    if (!error && data) router.push(`/samtale/${data}`);
  };

  const block = async () => {
    await supabase.from('blocks').insert({ blocker_id: me.id, blocked_id: p.id });
    if (p.my_follow) await unfollow(me.id, p.id);
    setToast(`${first} er blokeret`);
    load();
  };
  const unblock = async () => {
    await supabase.from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', p.id);
    setToast(`${first} er ikke længere blokeret`);
    load();
  };
  const removeFollower = async () => {
    await supabase.from('follows').delete().eq('follower_id', p.id).eq('followee_id', me.id);
    setToast(`${first} følger dig ikke længere`);
    load();
  };
  const report = async (reason: string) => {
    await supabase.from('reports').insert({ reporter_id: me.id, profile_id: p.id, reason });
  };

  return (
    <View style={s.root}>
      <PageHeader title={p.public_kind === 'side' ? 'Side' : 'Profil'} fallback="/">
        <IconButton icon="dots" label="Mere" onPress={() => setMenuOpen(true)} />
      </PageHeader>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}>
        <ProfileCard
          name={p.name}
          username={p.username}
          avatarPath={p.avatar_path}
          ring={moments.any && !blocked ? (moments.seen ? 'seen' : 'new') : 'none'}
          onRing={moments.any && !blocked ? () => router.push({ pathname: '/moment/[id]', params: { id: p.id } }) : undefined}
          ringLabel={`Se moments fra ${p.name}`}
          badges={
            p.is_private || p.public_kind || (p.follows_me && !blocked) ? (
              <>
                {p.is_private && <ProfileBadge icon="lock">Privat profil</ProfileBadge>}
                {p.public_kind && (
                  <ProfileBadge icon={p.public_kind === 'person' ? 'globe' : 'building'} tone={p.public_kind === 'side' ? 'plain' : 'note'}>
                    {publicLabel[p.public_kind]}
                  </ProfileBadge>
                )}
                {p.follows_me && !blocked && <ProfileBadge tone={following ? 'note' : 'plain'}>{following ? 'I følger hinanden' : 'Følger dig'}</ProfileBadge>}
              </>
            ) : undefined
          }
          bio={blocked ? null : p.bio}
          stats={
            blocked
              ? []
              : [
                  { n: postCount, label: 'Opslag' },
                  { n: p.followers, label: 'Følgere', onPress: p.can_see ? () => router.push({ pathname: '/forbindelser', params: { bruger: p.username } }) : undefined },
                  ...(p.public_kind !== 'side'
                    ? [{ n: p.following, label: 'Følger', onPress: p.can_see ? () => router.push({ pathname: '/forbindelser', params: { bruger: p.username, fane: 'foelger' } }) : undefined }]
                    : []),
                ]
          }
        >
          {blocked ? (
            <View style={s.blocked}>
              <T v="headingS">Du har blokeret {first}</T>
              <Button variant="secondary" onPress={unblock}>
                Fjern blokering
              </Button>
            </View>
          ) : (
            <View style={s.actions}>
              <Button
                variant={p.my_follow ? 'secondary' : 'primary'}
                block
                loading={busy}
                accessibilityState={{ selected: !!p.my_follow }}
                onPress={toggleFollow}
                style={{ flex: 1 }}
              >
                {following ? 'Følger' : p.my_follow === 'pending' ? 'Anmodet' : p.is_private ? 'Anmod om at følge' : p.follows_me ? 'Følg tilbage' : 'Følg'}
              </Button>
              <Button variant="secondary" block onPress={message} style={{ flex: 1 }}>
                Besked
              </Button>
            </View>
          )}
        </ProfileCard>

        {!blocked && (
          <>
            <ProfilePosts userId={p.id} name={first} posts={posts} locked={!p.can_see} onChanged={load} />
          </>
        )}
      </ScrollView>

      {toast && (
        <View style={[s.toast, { bottom: 24 + insets.bottom }]} accessibilityRole="alert">
          <T v="captionStrong" c={color.textOnAction} numberOfLines={1}>
            {toast}
          </T>
        </View>
      )}

      <UserMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={first}
        blocked={blocked}
        followsMe={p.follows_me}
        onBlock={block}
        onUnblock={unblock}
        onRemoveFollower={removeFollower}
        onReport={report}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 16, paddingTop: 4, paddingHorizontal: 20 },
  blocked: { alignItems: 'flex-start', gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 40,
    maxWidth: '90%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.actionPrimary,
  },
});
