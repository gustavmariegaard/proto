import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { getGroup, groupMembers, joinGroup, leaveGroup, postsWhere, type GroupCard, type Member } from '@/lib/community';
import { useMe } from '@/lib/session';
import type { PostCard as Post } from '@/lib/types';
import { color, radius, TAP } from '@/theme/tokens';

/** En gruppe: navn, beskrivelse, medlemmer og opslag */
export default function GroupView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [group, setGroup] = useState<GroupCard | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const g = await getGroup(id);
    setGroup(g);
    if (g) {
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

  if (group === undefined) return <Screen title="Gruppe">{null}</Screen>;
  if (group === null)
    return (
      <Screen title="Gruppe">
        <T v="bodyS" c={color.textSecondary}>
          Gruppen findes ikke længere.
        </T>
      </Screen>
    );

  const member = group.my_status === 'medlem';
  const admin = member && group.my_role === 'admin';
  const canSee = member || group.privacy === 'offentlig';
  const active = members.filter((m) => m.status === 'medlem');
  const requests = members.filter((m) => m.status === 'anmodet');

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    await load();
    setBusy(false);
  };

  return (
    <Screen title="Gruppe">
      <View style={s.head}>
        <Avatar name={group.name} path={group.avatar_path} size="L" />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="headingM" accessibilityRole="header">
            {group.name}
          </T>
          <View style={s.meta}>
            <Icon name={group.privacy === 'privat' ? 'lock' : 'globe'} size={14} color={color.textSecondary} />
            <T v="caption" c={color.textSecondary}>
              {group.privacy === 'privat' ? 'Privat gruppe' : 'Offentlig gruppe'} · {group.members} {group.members === 1 ? 'medlem' : 'medlemmer'}
            </T>
          </View>
        </View>
      </View>
      {!!group.description && <T v="bodyS">{group.description}</T>}

      {member ? (
        <View style={s.buttons}>
          <Button title="Skriv i gruppen" icon="edit" style={{ flex: 1 }} onPress={() => router.push(`/opret?gruppe=${group.id}`)} />
          <Button title="Begivenhed" variant="secondary" icon="calendar" style={{ flex: 1 }} onPress={() => router.push(`/begivenheder/ny?gruppe=${group.id}`)} />
        </View>
      ) : group.my_status === 'anmodet' ? (
        <Button title="Træk anmodning tilbage" variant="secondary" block loading={busy} onPress={() => act(() => leaveGroup(group.id, me.id))} />
      ) : (
        <Button
          title={group.privacy === 'offentlig' ? 'Bliv medlem' : 'Anmod om at blive medlem'}
          block
          loading={busy}
          onPress={() => act(() => joinGroup(group, me.id))}
        />
      )}
      {group.my_status === 'anmodet' && (
        <T v="caption" c={color.textSecondary}>
          Anmodet. En administrator skal godkende dig.
        </T>
      )}

      {canSee && (
        <Pressable accessibilityRole="link" onPress={() => router.push(`/grupper/${group.id}/medlemmer`)} style={s.members}>
          <View style={s.faces}>
            {active.slice(0, 5).map((m, i) => (
              <View key={m.id} style={{ marginLeft: i ? -8 : 0, borderRadius: 14, borderWidth: 2, borderColor: color.bgSubtle }}>
                <Avatar name={m.name} path={m.avatar_path} size="S" />
              </View>
            ))}
          </View>
          <T v="label" style={{ flex: 1 }}>
            Medlemmer
          </T>
          {admin && requests.length > 0 && (
            <View style={s.badge}>
              <T v="captionStrong">
                {requests.length} {requests.length === 1 ? 'anmodning' : 'anmodninger'}
              </T>
            </View>
          )}
          <Icon name="chevron-right" size={18} />
        </Pressable>
      )}

      <View style={{ gap: 12 }}>
        <T v="headingM" accessibilityRole="header">
          Opslag i gruppen
        </T>
        {!canSee ? (
          <View style={s.locked}>
            <Icon name="lock" size={22} />
            <T v="headingS">Gruppen er privat</T>
            <T v="caption" c={color.textSecondary}>
              Kun medlemmer kan se opslag.
            </T>
          </View>
        ) : posts.length ? (
          posts.map((p) => <PostCard key={p.id} post={p} onRemoved={() => setPosts((l) => l.filter((x) => x.id !== p.id))} />)
        ) : (
          <T v="caption" c={color.textSecondary}>
            Ingen opslag endnu.
          </T>
        )}
      </View>

      {member && !admin && (
        <Button title="Forlad gruppen" variant="danger" onPress={() => act(() => leaveGroup(group.id, me.id))} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  buttons: { flexDirection: 'row', gap: 8 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TAP + 12, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  faces: { flexDirection: 'row' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color.accentBg },
  locked: { alignItems: 'center', gap: 6, padding: 24, borderRadius: radius.xl, backgroundColor: color.bgSubtle },
});
