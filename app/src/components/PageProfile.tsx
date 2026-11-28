import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { postsWhere, setFollowPage, type PageCard } from '@/lib/community';
import { activeMoments } from '@/lib/moments';
import { markSeen } from '@/lib/moreActivity';
import { useActingAs } from '@/lib/actingAs';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { AccountSwitcher } from './AccountSwitcher';
import { Button } from './Button';
import { Glass } from './Glass';
import { IconButton } from './IconButton';
import { ProfileBadge, ProfileCard } from './ProfileCard';
import { ProfilePosts } from './ProfilePosts';

type Props = {
  page: PageCard;
  /** Du bruger appen som siden (Profil-fanen): skift-knap ved navnet og knapper til at lave nyt */
  acting?: boolean;
  onChanged?: () => void;
};

/**
 * En side vist med samme profilkort som personer, men tilpasset:
 * "Side"-mærke og kategori, tallene Opslag og Følgere, og fanerne Opslag og Flicks (ingen debat).
 * - Besøgende: Følg og Besked.
 * - Admin, der bruger appen som sig selv: "Skift til siden" og "Rediger side".
 * - Som siden: navnet skifter profil, og knapperne laver nyt opslag og moment som siden.
 */
export function PageProfile({ page, acting = false, onChanged }: Props) {
  const me = useMe();
  const { pages, switchTo } = useActingAs(me.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [moments, setMoments] = useState({ any: false, seen: true });
  const [followers, setFollowers] = useState(page.followers);
  const [following, setFollowing] = useState(page.i_follow);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    markSeen(page.id);
    const [list, ms] = await Promise.all([postsWhere('page_id', page.id), activeMoments(page.id, 'side')]);
    setPosts(list);
    setMoments({ any: ms.length > 0, seen: ms.every((m) => m.seen) });
  }, [page.id]);
  useFocusEffect(
    useCallback(() => {
      load();
      setFollowers(page.followers);
      setFollowing(page.i_follow);
    }, [load, page.followers, page.i_follow]),
  );

  const toggle = async () => {
    setFollowing(!following);
    setFollowers((n) => n + (following ? -1 : 1));
    await setFollowPage(page.id, me.id, !following);
    onChanged?.();
  };
  // Beskeder til en side går til den, der har oprettet den
  const message = async () => {
    const { data, error } = await supabase.rpc('start_conversation', { member_ids: [page.created_by] });
    if (!error && data) router.push(`/samtale/${data}`);
  };
  const becomePage = async () => {
    const mine = pages.find((p) => p.id === page.id);
    if (!mine) return;
    await switchTo(mine);
    router.navigate('/profil');
  };

  const postCount = posts.filter((p) => !p.group_id && !p.event_id).length;
  const edit = () => router.push({ pathname: '/sider/rediger', params: { id: page.id } });

  return (
    <>
      <ProfileCard
        name={page.name}
        username={page.handle}
        avatarPath={page.avatar_path}
        ring={moments.any ? (acting || !moments.seen ? 'new' : 'seen') : 'none'}
        onRing={
          moments.any
            ? () => router.push({ pathname: '/moment/[id]', params: { id: page.id, type: 'side' } })
            : acting
              ? () => router.push({ pathname: '/ny-moment', params: { side: page.id } })
              : undefined
        }
        plus={acting && !moments.any}
        ringLabel={moments.any ? `Se moments fra ${page.name}` : 'Del et moment som siden'}
        onSwitch={acting ? () => setSwitching(true) : undefined}
        badges={
          <>
            <ProfileBadge icon="building">Side</ProfileBadge>
            {!!page.category.trim() && <ProfileBadge>{page.category.trim()}</ProfileBadge>}
          </>
        }
        bio={page.bio}
        stats={[
          { n: postCount, label: 'Opslag' },
          { n: followers, label: followers === 1 ? 'Følger' : 'Følgere' },
        ]}
        corner={
          // Som siden: tandhjulet er appens indstillinger (som på din personlige profil)
          acting ? (
            <Glass style={{ borderRadius: 999 }}>
              <IconButton icon="settings" label="Indstillinger" onPress={() => router.push('/indstillinger')} />
            </Glass>
          ) : undefined
        }
        action={
          acting ? (
            <Button variant="secondary" icon="edit" onPress={edit} style={{ minHeight: 40, paddingHorizontal: 16 }}>
              Rediger side
            </Button>
          ) : undefined
        }
      >
        <View style={s.actions}>
          {acting ? (
            <>
              <Button block icon="plus" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/opret', params: { side: page.id } })}>
                Nyt opslag
              </Button>
              <Button variant="secondary" block style={{ flex: 1 }} onPress={() => switchTo(null)}>
                Skift til dig
              </Button>
            </>
          ) : page.i_admin ? (
            <>
              <Button block style={{ flex: 1 }} onPress={becomePage}>
                Skift til siden
              </Button>
              <Button variant="secondary" block style={{ flex: 1 }} onPress={edit}>
                Rediger side
              </Button>
            </>
          ) : (
            <>
              <Button variant={following ? 'secondary' : 'primary'} block style={{ flex: 1 }} accessibilityState={{ selected: following }} onPress={toggle}>
                {following ? 'Følger' : 'Følg'}
              </Button>
              <Button variant="secondary" block style={{ flex: 1 }} onPress={message}>
                Besked
              </Button>
            </>
          )}
        </View>
      </ProfileCard>

      <ProfilePosts page userId={page.id} posts={posts} own={page.i_admin} name={page.name} onChanged={load} />
      {acting && <AccountSwitcher open={switching} onClose={() => setSwitching(false)} />}
    </>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
});
