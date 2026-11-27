import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { InitialsAvatar, MoreScreen } from '@/components/MoreParts';
import { PostCard } from '@/components/PostCard';
import { T } from '@/components/T';
import { getGroup, groupMembers, joinGroup, leaveGroup, postsWhere, type GroupCard, type Member } from '@/lib/community';
import { markSeen } from '@/lib/moreActivity';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { PostCard as Post } from '@/lib/types';
import { color, radius, TAP } from '@/theme/tokens';

/** En gruppe: medlemmer, skriv i gruppen og gruppens opslag (prototypens GroupView) */
export default function GroupView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [group, setGroup] = useState<GroupCard | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const g = await getGroup(id);
    setGroup(g);
    if (g) {
      markSeen(g.id);
      const [m, p] = await Promise.all([groupMembers(id), postsWhere('group_id', id)]);
      setMembers(m);
      setPosts(p);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!group)
    return (
      <MoreScreen title="Gruppe" fallback="/grupper">
        {group === null && (
          <T v="bodyS" c={color.textSecondary}>
            Gruppen findes ikke længere.
          </T>
        )}
      </MoreScreen>
    );

  const member = group.my_status === 'medlem';
  const canSee = member || group.privacy === 'offentlig';
  // Admins først, derefter efter navn; du selv vises som "Dig" forrest
  const others = members
    .filter((m) => m.status === 'medlem' && m.id !== me.id)
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, 'da') : a.role === 'admin' ? -1 : 1));
  const meMember = members.find((m) => m.id === me.id && m.status === 'medlem');

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    await load();
    setBusy(false);
  };
  const join = () =>
    act(async () => {
      if (group.my_status === 'inviteret') await supabase.from('group_members').update({ status: 'medlem' }).eq('group_id', group.id).eq('user_id', me.id);
      else if (group.my_status === 'anmodet') await leaveGroup(group.id, me.id);
      else await joinGroup(group, me.id);
    });

  const status = member ? 'Du er medlem' : group.my_status === 'anmodet' ? 'Anmodning sendt' : group.my_status === 'inviteret' ? 'Du er inviteret' : 'Ikke medlem';

  return (
    <MoreScreen title="Gruppe" fallback="/grupper">
      <View style={s.head}>
        <InitialsAvatar name={group.name} path={group.avatar_path} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="headingM" accessibilityRole="header">
            {group.name}
          </T>
          <T v="caption" c={color.textSecondary}>
            {group.members} {group.members === 1 ? 'medlem' : 'medlemmer'} · {status}
          </T>
          <View style={s.badge}>
            <Icon name="circles" size={14} />
            <T v="captionStrong">Gruppe</T>
          </View>
        </View>
      </View>
      {!!group.description && <T v="bodyS">{group.description}</T>}

      <View style={s.actions}>
        <Button block style={{ flex: 1 }} disabled={!member} onPress={() => router.push(`/opret?gruppe=${group.id}`)}>
          Skriv i gruppen
        </Button>
        <Button variant="secondary" block style={{ flex: 1 }} loading={busy} onPress={member ? () => act(() => leaveGroup(group.id, me.id)) : join}>
          {member ? 'Forlad gruppe' : group.my_status === 'anmodet' ? 'Fortryd anmodning' : 'Bliv medlem'}
        </Button>
      </View>

      {canSee && (
        <View style={s.members}>
          <View style={s.membersHead}>
            <T v="headingS" accessibilityRole="header">
              Medlemmer
            </T>
            <Pressable accessibilityRole="link" onPress={() => router.push(`/grupper/${group.id}/medlemmer`)} style={s.all}>
              <T v="captionStrong" style={{ textDecorationLine: 'underline' }}>
                Se alle {group.members}
              </T>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.memberList} contentContainerStyle={s.memberListContent}>
            {meMember && (
              <Pressable accessibilityRole="link" onPress={() => router.push('/profil')} style={s.member}>
                <Avatar name={me.name || 'Dig'} path={me.avatar_path} size="L" />
                <T v="captionStrong" numberOfLines={1}>
                  Dig
                </T>
              </Pressable>
            )}
            {/* Kun én række; resten under "Se alle" */}
            {others.slice(0, 12).map((m) => (
              <Pressable key={m.id} accessibilityRole="link" onPress={() => router.push(`/bruger/${m.username}`)} style={s.member}>
                <Avatar name={m.name} path={m.avatar_path} size="L" />
                <T v="captionStrong" numberOfLines={1}>
                  {m.name.split(' ')[0]}
                </T>
                {m.role === 'admin' && (
                  <T v="caption" c={color.textSecondary} style={{ marginTop: -4 }}>
                    Admin
                  </T>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <T v="headingS" accessibilityRole="header">
        Opslag i gruppen
      </T>
      {!canSee ? (
        <T v="bodyS" c={color.textSecondary}>
          Kun medlemmer kan se opslag i gruppen.
        </T>
      ) : posts?.length === 0 ? (
        <T v="bodyS" c={color.textSecondary}>
          Der er ingen opslag endnu. Skriv det første.
        </T>
      ) : (
        <View style={s.posts}>
          {posts?.map((p) => (
            <PostCard key={p.id} post={p} onRemoved={() => setPosts((l) => l?.filter((x) => x.id !== p.id) ?? null)} />
          ))}
        </View>
      )}
    </MoreScreen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.bgSubtle,
  },
  actions: { flexDirection: 'row', gap: 8 },
  members: { gap: 10 },
  membersHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  all: { minHeight: TAP, paddingHorizontal: 4, justifyContent: 'center' },
  memberList: { marginHorizontal: -20 },
  memberListContent: { gap: 10, paddingHorizontal: 20, paddingBottom: 2 },
  member: { width: 64, alignItems: 'center', gap: 4 },
  posts: { gap: 14 },
});
