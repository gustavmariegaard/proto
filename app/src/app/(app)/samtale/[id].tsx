import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ConversationAvatar } from '@/components/ConversationAvatar';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { T } from '@/components/T';
import { conversationTitle, markRead, myConversations, type ConversationRow } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';
import { ListingContext } from '@/components/ListingContext';
import { SharedPost } from '@/components/SharedPost';
import { color, font, radius, TAP } from '@/theme/tokens';

const GAP = 15 * 60 * 1000;

/** Tidsstempel over en gruppe beskeder: "14:32", "I går 09:10" eller "3. dec. 18:00" */
function stamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (diff === 0) return time;
  if (diff === 1) return `I går ${time}`;
  return `${d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })} ${time}`;
}

/** En samtale: beskeder live, skrivefelt nederst. Anmodninger skal accepteres først. */
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConv = useCallback(async () => {
    const all = await myConversations().catch(() => []);
    const c = all.find((x) => x.id === id) ?? null;
    setConv(c);
    setMissing(!c);
  }, [id]);

  useEffect(() => {
    loadConv();
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setMessages((data ?? []) as Message[]));
    markRead(id, me.id);

    const ch = supabase
      .channel(`conv-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as Message;
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [m, ...list]));
        markRead(id, me.id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, me.id, loadConv]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: me.id, body }).select().single();
    setSending(false);
    if (error) {
      setError('Beskeden kunne ikke sendes.');
      return;
    }
    setText('');
    setMessages((list) => (list.some((x) => x.id === data.id) ? list : [data as Message, ...list]));
    // At svare accepterer en anmodning
    if (conv?.is_request) setConv({ ...conv, is_request: false });
  };

  const accept = async () => {
    await supabase.from('conversation_members').update({ is_request: false }).eq('conversation_id', id).eq('user_id', me.id);
    if (conv) setConv({ ...conv, is_request: false });
  };

  const decline = async () => {
    await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', me.id);
    router.canGoBack() ? router.back() : router.replace('/beskeder');
  };

  const members = conv?.members ?? [];
  const direct = members.length === 1 && !conv?.is_group;
  const title = conv ? conversationTitle(conv) : '';
  const byId = new Map(members.map((m) => [m.id, m]));
  const pending = !!conv?.is_request && messages.some((m) => m.sender_id !== me.id);
  // Torvet: seneste annonce, samtalen handler om (vises øverst)
  const listingId = (messages.find((m) => (m as Message & { listing_id?: string | null }).listing_id) as (Message & { listing_id?: string | null }) | undefined)?.listing_id;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <IconButton icon="chevron-left" label="Tilbage" outline onPress={() => (router.canGoBack() ? router.back() : router.replace('/beskeder'))} />
        {conv && (
          <Pressable
            accessibilityRole={direct ? 'link' : undefined}
            accessibilityLabel={direct ? `Gå til ${title}` : title}
            disabled={!direct}
            onPress={() => direct && router.push(`/bruger/${members[0]!.username}`)}
            style={s.who}
          >
            <ConversationAvatar members={members} />
            <View style={{ flex: 1 }}>
              <T v="headingS" numberOfLines={1}>
                {title}
              </T>
              <T v="caption" c={color.textSecondary} numberOfLines={1}>
                {direct ? `@${members[0]!.username}` : `${members.length + 1} personer`}
              </T>
            </View>
          </Pressable>
        )}
      </View>

      {missing ? (
        <View style={s.center}>
          <T v="body" c={color.textSecondary}>
            Samtalen findes ikke længere.
          </T>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {listingId && <ListingContext listingId={listingId} />}
          <FlatList
            inverted
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={[s.center, { transform: [{ scaleY: -1 }] }]}>
                <T v="bodyS" c={color.textSecondary}>
                  Skriv den første besked.
                </T>
              </View>
            }
            renderItem={({ item: m, index }) => {
              const mine = m.sender_id === me.id;
              // Listen er vendt: index + 1 er den ældre besked
              const older = messages[index + 1];
              const showStamp = !older || new Date(m.created_at).getTime() - new Date(older.created_at).getTime() > GAP;
              const showName = !mine && !direct && (!older || older.sender_id !== m.sender_id || showStamp);
              return (
                <View>
                  {showStamp && (
                    <T v="caption" c={color.textSecondary} style={s.stamp}>
                      {stamp(m.created_at)}
                    </T>
                  )}
                  {showName && (
                    <T v="caption" c={color.textSecondary} style={s.name}>
                      {byId.get(m.sender_id)?.name ?? 'Tidligere medlem'}
                    </T>
                  )}
                  <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                    {(m as Message & { listing_id?: string | null }).listing_id && (
                      <ListingContext listingId={(m as Message & { listing_id: string }).listing_id} inBubble mine={mine} />
                    )}
                    {(m as Message & { post_id?: string | null }).post_id && (
                      <SharedPost id={(m as Message & { post_id: string }).post_id} compact onDark={mine} />
                    )}
                    {!!m.body && (
                      <T v="body" c={mine ? color.textOnAction : color.textPrimary}>
                        {m.body}
                      </T>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {pending ? (
            <View style={s.request}>
              <T v="headingS" style={{ textAlign: 'center' }}>
                {title.split(' ')[0]} vil skrive til dig
              </T>
              <View style={s.requestButtons}>
                <Button title="Slet" variant="secondary" style={{ flex: 1 }} onPress={decline} />
                <Button title="Accepter" style={{ flex: 1 }} onPress={accept} />
              </View>
            </View>
          ) : (
            <View style={s.composer}>
              {!!error && (
                <T v="caption" c={color.danger} style={{ position: 'absolute', top: -18, left: 24 }}>
                  {error}
                </T>
              )}
              <TextInput
                style={s.field}
                placeholder="Skriv en besked"
                placeholderTextColor={color.textSecondary}
                accessibilityLabel="Skriv en besked"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={4000}
                onSubmitEditing={send}
                blurOnSubmit={false}
                onKeyPress={(e: any) => {
                  // Web: Enter sender, Shift+Enter giver ny linje
                  if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault?.();
                    send();
                  }
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={!text.trim() || sending}
                onPress={send}
                style={[s.send, (!text.trim() || sending) && { opacity: 0.35 }]}
              >
                <Icon name="send" size={20} color={color.textOnAction} />
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TAP },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stamp: { textAlign: 'center', marginVertical: 10 },
  name: { marginLeft: 12, marginBottom: 2 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mine: { alignSelf: 'flex-end', backgroundColor: color.actionPrimary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: color.bgSurface, borderWidth: 1, borderColor: color.borderDefault, borderBottomLeftRadius: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  field: {
    flex: 1,
    minHeight: TAP + 4,
    maxHeight: 140,
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
  },
  send: { width: TAP + 4, height: TAP + 4, borderRadius: radius.pill, backgroundColor: color.actionPrimary, alignItems: 'center', justifyContent: 'center' },
  request: { gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgSurface },
  requestButtons: { flexDirection: 'row', gap: 10 },
});
