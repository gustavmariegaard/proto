import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { T } from '@/components/T';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { NotificationRow } from '@/lib/types';
import { color, radius } from '@/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

type Row = NotificationRow & { event?: { title: string } | null; group?: { name: string } | null };

/** Teksten efter navnet (prototypen: "Mette Lund kommenterede dit opslag.") */
function sentence(n: Row, requestOpen: boolean, accepted: boolean) {
  const who = n.actor?.name ?? '';
  switch (n.type) {
    case 'follow':
      return `${who} begyndte at følge dig.`;
    case 'follow_request':
      return accepted ? `${who} følger dig nu.` : requestOpen ? `${who} vil gerne følge dig.` : `${who} bad om at følge dig.`;
    case 'like':
      return `${who} synes godt om dit opslag.`;
    case 'comment':
      return `${who} kommenterede dit opslag.`;
    case 'note':
      return 'Læsere har tilføjet kontekst til dit opslag.';
    case 'message':
      return `${who} sendte dig en besked.`;
    case 'group_request':
      return n.group?.name ? `${who} vil være med i ${n.group.name}.` : `${who} vil være med i din gruppe.`;
    case 'event_invite':
      return n.event?.title ? `${who} inviterede dig til ${n.event.title}.` : `${who} inviterede dig til en begivenhed.`;
    case 'mention':
      return `${who} taggede dig i et opslag.`;
    case 'mention_bio':
      return `${who} taggede dig i sin bio.`;
  }
}

/** "Lige nu", "5 min.", "1 time", "2 timer", "I går", "3 dage", ellers dato (som prototypens tider) */
function when(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Lige nu';
  if (s < 3600) return `${Math.floor(s / 60)} min.`;
  const h = Math.floor(s / 3600);
  if (h < 24) return h === 1 ? '1 time' : `${h} timer`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'I går';
  if (d < 7) return `${d} dage`;
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

/** Notifikationer: nye øverst, tidligere nedenunder. Åbnes fra klokken i topbaren. Følgeanmodninger besvares her. */
export default function Notifications() {
  const me = useMe();
  const [rows, setRows] = useState<Row[] | null>(null);
  // Ulæste, da listen blev åbnet (vises under "Nye" med prik)
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: req }] = await Promise.all([
      supabase
        .from('notifications')
        .select(
          'id, type, post_id, group_id, event_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, username, name, avatar_path), event:events(title), group:groups(name)',
        )
        .neq('type', 'message')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('follows').select('follower_id').eq('followee_id', me.id).eq('status', 'pending'),
    ]);
    const list = (data ?? []) as unknown as Row[];
    setRows(list);
    setFresh((prev) => new Set([...prev, ...list.filter((n) => !n.read_at).map((n) => n.id)]));
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
    if (approve) {
      setAccepted((a) => new Set(a).add(actorId));
      await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', actorId).eq('followee_id', me.id);
    } else await supabase.from('follows').delete().eq('follower_id', actorId).eq('followee_id', me.id);
  };

  const open = (n: Row) => {
    setFresh((f) => {
      const x = new Set(f);
      x.delete(n.id);
      return x;
    });
    if (n.type === 'group_request' && n.group_id) router.push(`/grupper/${n.group_id}/medlemmer`);
    else if (n.type === 'event_invite' && n.event_id) router.push(`/begivenheder/${n.event_id}`);
    else if (n.post_id) router.push(`/opslag/${n.post_id}`);
    else if (n.actor) router.push(`/bruger/${n.actor.username}`);
  };

  // Afviste og ignorerede anmodninger forsvinder fra listen (som i prototypen)
  const visible = (rows ?? []).filter((n) => !ignored.has(n.id));
  const groups = [
    { id: 'nye', title: 'Nye', items: visible.filter((n) => fresh.has(n.id)) },
    { id: 'tidligere', title: 'Tidligere', items: visible.filter((n) => !fresh.has(n.id)) },
  ].filter((g) => g.items.length > 0);

  const card = (n: Row) => {
    const isRequest = n.type === 'follow_request' && !!n.actor && pending.has(n.actor.id);
    const text = sentence(n, isRequest, n.type === 'follow_request' && !!n.actor && accepted.has(n.actor.id));
    const row = (
      <View style={s.row}>
        <Avatar name={n.actor?.name ?? 'ciircle'} path={n.actor?.avatar_path} />
        <View style={s.text}>
          <T v="bodyS">{text}</T>
          <T v="caption" c={color.textSecondary}>
            {when(n.created_at)}
          </T>
        </View>
        <View style={[s.dot, fresh.has(n.id) && s.dotOn]} accessibilityLabel={fresh.has(n.id) ? 'Ulæst' : undefined} />
      </View>
    );
    if (isRequest)
      return (
        <View key={n.id} style={s.card}>
          {row}
          <View style={s.buttons}>
            <Button onPress={() => answer(n.actor!.id, true)}>Accepter</Button>
            <Button
              variant="secondary"
              onPress={() => {
                setIgnored((x) => new Set(x).add(n.id));
                answer(n.actor!.id, false);
              }}
            >
              Afvis
            </Button>
            <Button variant="ghost" onPress={() => setIgnored((x) => new Set(x).add(n.id))}>
              Ignorer
            </Button>
          </View>
        </View>
      );
    return (
      <Pressable key={n.id} accessibilityRole="link" onPress={() => open(n)} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
        {row}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <PageHeader title="Notifikationer" />
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
        {rows && groups.length === 0 && (
          <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center' }}>
            Du har ingen notifikationer
          </T>
        )}
        {groups.map((g) => (
          <View key={g.id} style={s.list}>
            <T v="headingS" accessibilityRole="header">
              {g.title}
            </T>
            <View style={s.list}>{g.items.map(card)}</View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  content: { gap: 14, paddingTop: 4, paddingHorizontal: 20, paddingBottom: 24 },
  list: { gap: 14 },
  card: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: color.borderDefault,
    borderRadius: radius.xl,
    backgroundColor: color.bgSurface,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  dotOn: { backgroundColor: color.accentHighlight },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
