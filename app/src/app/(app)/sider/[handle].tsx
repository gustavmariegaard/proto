import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { ProfilePosts } from '@/components/ProfilePosts';
import { T } from '@/components/T';
import { getPage, postsWhere, setFollowPage, type PageCard } from '@/lib/community';
import { markSeen } from '@/lib/moreActivity';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { fmtNumber } from '@/lib/time';
import type { PostCard as Post } from '@/lib/types';
import { color, radius } from '@/theme/tokens';

/**
 * En side (prototypens UserProfile for en side, /bruger/:handle):
 * billede, navn, @adresse, "Side"-mærke, beskrivelse, tal, Følg/Besked og sidens opslag.
 */
export default function PageView() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<PageCard | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);

  const load = useCallback(async () => {
    const p = await getPage(handle);
    setPage(p);
    if (p) {
      markSeen(p.id);
      setPosts(await postsWhere('page_id', p.id));
    }
  }, [handle]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async () => {
    if (!page) return;
    setPage({ ...page, i_follow: !page.i_follow, followers: page.followers + (page.i_follow ? -1 : 1) });
    await setFollowPage(page.id, me.id, !page.i_follow);
  };
  // Beskeder til en side går til den, der har oprettet den
  const message = async () => {
    if (!page) return;
    const { data, error } = await supabase.rpc('start_conversation', { member_ids: [page.created_by] });
    if (!error && data) router.push(`/samtale/${data}`);
  };

  return (
    <View style={s.screen}>
      <PageHeader title="Side" fallback="/sider" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { paddingBottom: 32 + insets.bottom }]}>
        {page === null && (
          <T v="bodyS" c={color.textSecondary}>
            Siden findes ikke.
          </T>
        )}
        {page && (
          <>
            <View style={s.identity}>
              <View style={s.ring}>
                <Avatar name={page.name} path={page.avatar_path} size="XL" />
              </View>
              <View style={s.name}>
                <T v="titleL" accessibilityRole="header">
                  {page.name}
                </T>
                <T v="caption" c={color.textSecondary}>
                  @{page.handle}
                </T>
                <View style={s.badge}>
                  <Icon name="building" size={14} />
                  <T v="captionStrong">Side</T>
                </View>
              </View>
            </View>

            {!!page.bio.trim() && <T v="bodyS">{page.bio.trim()}</T>}

            <View style={s.stats}>
              <View style={s.stat} accessible accessibilityLabel={`${fmtNumber(posts.length)} Opslag`}>
                <T v="headingM">{fmtNumber(posts.length)}</T>
                <T v="caption" c={color.textSecondary}>
                  Opslag
                </T>
              </View>
              <View style={s.stat} accessible accessibilityLabel={`${fmtNumber(page.followers)} Følgere`}>
                <T v="headingM">{fmtNumber(page.followers)}</T>
                <T v="caption" c={color.textSecondary}>
                  Følgere
                </T>
              </View>
            </View>

            <View style={s.actions}>
              {page.i_admin ? (
                <Button block style={{ flex: 1 }} onPress={() => router.push(`/opret?side=${page.id}`)}>
                  Skriv som siden
                </Button>
              ) : (
                <>
                  <Button
                    variant={page.i_follow ? 'secondary' : 'primary'}
                    block
                    style={{ flex: 1 }}
                    accessibilityState={{ selected: page.i_follow }}
                    onPress={toggle}
                  >
                    {page.i_follow ? 'Følger' : 'Følg'}
                  </Button>
                  <Button variant="secondary" block style={{ flex: 1 }} onPress={message}>
                    Besked
                  </Button>
                </>
              )}
            </View>

            <ProfilePosts userId={page.id} posts={posts} name={page.name} onChanged={load} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 16, paddingTop: 4, paddingHorizontal: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ring: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.bgSubtle,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-around', padding: 12, borderWidth: 1, borderColor: color.borderDefault, borderRadius: radius.lg },
  stat: { alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
});
