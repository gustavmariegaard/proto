import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import type { NotificationRow } from '@/lib/types';
import { color, radius } from '@/theme/tokens';

const text: Record<NotificationRow['type'], string> = {
  follow: 'begyndte at følge dig',
  follow_request: 'vil følge dig',
  like: 'synes godt om dit opslag',
  comment: 'kommenterede dit opslag',
  note: 'Læsere har tilføjet kontekst til dit opslag',
  message: 'sendte dig en besked',
};

/** Notifikationer: følgere, hjerter, kommentarer og noter. Følgeanmodninger godkendes her. */
export default function Notifications() {
  const me = useMe();
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: req }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, post_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, username, name, avatar_path)')
        .neq('type', 'message')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('follows').select('follower_id').eq('followee_id', me.id).eq('status', 'pending'),
    ]);
    setRows((data ?? []) as unknown as NotificationRow[]);
    setPending(new Set((req ?? []).map((r) => r.follower_id)));
    // Alt er set, når listen er åbnet
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  }, [me.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const answer = async (actorId: string, approve: boolean) => {
    setPending((p) => {
      const n = new Set(p);
      n.delete(actorId);
      return n;
    });
    if (approve) await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', actorId).eq('followee_id', me.id);
    else await supabase.from('follows').delete().eq('follower_id', actorId).eq('followee_id', me.id);
  };

  return (
    <Screen title="Notifikationer" scroll={false}>
      <FlatList
        data={rows ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 4 }}
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
        ListEmptyComponent={
          rows ? (
            <T v="bodyS" c={color.textSecondary} style={{ paddingTop: 24, textAlign: 'center' }}>
              Ingen notifikationer endnu.
            </T>
          ) : undefined
        }
        renderItem={({ item: n }) => {
          const unread = !n.read_at;
          const go = () => {
            if (n.post_id) router.push(`/opslag/${n.post_id}`);
            else if (n.actor) router.push(`/bruger/${n.actor.username}`);
          };
          const isRequest = n.type === 'follow_request' && n.actor && pending.has(n.actor.id);
          const label = n.type === 'follow_request' && !isRequest ? 'bad om at følge dig' : text[n.type];
          return (
            <View style={[s.row, unread && s.unread]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${n.actor ? n.actor.name + ' ' : ''}${label}`}
                onPress={go}
                style={({ pressed }) => [s.main, pressed && { opacity: 0.7 }]}
              >
                {n.actor ? (
                  <Avatar name={n.actor.name} path={n.actor.avatar_path} />
                ) : (
                  <View style={s.noteIcon}>
                    <Icon name="circles" size={20} />
                  </View>
                )}
                <T v="bodyS" style={{ flex: 1 }}>
                  {n.actor && <T v="headingS">{n.actor.name} </T>}
                  {label}
                  <T v="caption" c={color.textSecondary}>
                    {'  '}
                    {ago(n.created_at)}
                  </T>
                </T>
              </Pressable>
              {isRequest && (
                <View style={s.buttons}>
                  <Button title="Godkend" style={s.small} onPress={() => answer(n.actor!.id, true)} />
                  <Button title="Afvis" variant="secondary" style={s.small} onPress={() => answer(n.actor!.id, false)} />
                </View>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { gap: 8, padding: 10, borderRadius: radius.lg },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unread: { backgroundColor: color.noteBg },
  noteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: 8, paddingLeft: 52 },
  small: { minHeight: 44, paddingHorizontal: 18 },
});
