import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ConversationAvatar } from '@/components/ConversationAvatar';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { conversationTitle, isUnread, myConversations, type ConversationRow } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import { color, radius, TAB_SPACE, TAP } from '@/theme/tokens';

type Tab = 'samtaler' | 'anmodninger';

/** Beskeder: dine samtaler og anmodninger fra folk, du ikke følger */
export default function Messages() {
  const me = useMe();
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [tab, setTab] = useState<Tab>('samtaler');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await myConversations());
    } catch {
      setRows((r) => r ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Nye beskeder opdaterer listen live
  useEffect(() => {
    const ch = supabase
      .channel(`inbox-${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me.id, load]);

  // Anmodning: jeg er markeret som anmodning, og der er skrevet noget
  const requests = (rows ?? []).filter((c) => c.is_request && c.has_messages);
  const convos = (rows ?? []).filter((c) => !c.is_request && c.has_messages);
  const list = tab === 'samtaler' ? convos : requests;

  return (
    <Screen
      title="Beskeder"
      edges={['top']}
      scroll={false}
      right={<IconButton icon="edit" label="Ny besked" onPress={() => router.push('/ny-besked')} />}
    >
      <View style={s.switch} accessibilityRole="tablist">
        {(['samtaler', 'anmodninger'] as const).map((t) => {
          const on = tab === t;
          const n = t === 'anmodninger' ? requests.length : 0;
          return (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t)} style={[s.seg, on && s.segOn]}>
              <T v="label" c={on ? color.textPrimary : color.textSecondary}>
                {t === 'samtaler' ? 'Samtaler' : n ? `Anmodninger (${n})` : 'Anmodninger'}
              </T>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: TAB_SPACE, gap: 4 }}
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
              {tab === 'samtaler' ? 'Ingen samtaler endnu.' : 'Ingen anmodninger.'}
            </T>
          ) : undefined
        }
        renderItem={({ item: c }) => {
          const unread = isUnread(c, me.id);
          const snippet = c.last_body ? `${c.last_sender_id === me.id ? 'Dig: ' : ''}${c.last_body}` : 'Ingen beskeder endnu';
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${conversationTitle(c)}${unread ? ', ulæst' : ''}`}
              onPress={() => router.push(`/samtale/${c.id}`)}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: color.bgSubtle }]}
            >
              <ConversationAvatar members={c.members} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.top}>
                  <T v="headingS" numberOfLines={1} style={{ flex: 1 }}>
                    {conversationTitle(c)}
                  </T>
                  <T v="caption" c={color.textSecondary}>
                    {ago(c.last_message_at)}
                  </T>
                </View>
                <T v={unread ? 'label' : 'bodyS'} c={unread ? color.textPrimary : color.textSecondary} numberOfLines={1}>
                  {snippet}
                </T>
              </View>
              {unread && <View style={s.dot} />}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  switch: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, padding: 4, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  seg: { flex: 1, minHeight: TAP - 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, paddingHorizontal: 8, borderRadius: radius.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.accent },
});
