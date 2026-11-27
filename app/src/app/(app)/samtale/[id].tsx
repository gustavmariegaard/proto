import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ListingContext } from '@/components/ListingContext';
import { msg } from '@/components/MessageParts';
import { SharedPost } from '@/components/SharedPost';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { conversationTitle, markRead, myConversations, type ConversationRow } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';
import { color, layout, radius } from '@/theme/tokens';

type Msg = Message & { listing_id?: string | null; post_id?: string | null };

/** Samtale (1:1) eller cirkel. Skrivefeltet ligger nederst, listen starter ved den nyeste besked. */
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  // Har modtageren (endnu) ikke godkendt? Så er det, du skriver, en anmodning.
  const [theyPending, setTheyPending] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const loadConv = useCallback(async () => {
    const all = await myConversations().catch(() => []);
    const c = all.find((x) => x.id === id) ?? null;
    setConv(c);
    setMissing(!c);
    const { data } = await supabase.from('conversation_members').select('user_id, is_request').eq('conversation_id', id).neq('user_id', me.id);
    setTheyPending((data ?? []).length === 1 && !!data![0]!.is_request);
  }, [id, me.id]);

  useEffect(() => {
    loadConv();
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
    markRead(id, me.id);

    const ch = supabase
      .channel(`conv-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as Msg;
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
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
    setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data as Msg]));
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
  const circle = !!conv && (conv.is_group || members.length > 1);
  const direct = !circle && members.length === 1;
  const title = conv ? conversationTitle(conv) : '';
  const byId = new Map(members.map((m) => [m.id, m]));
  const pending = !!conv?.is_request && messages.some((m) => m.sender_id !== me.id);
  const iWrote = messages.some((m) => m.sender_id === me.id);
  const memberLine = circle ? `${members.map((m) => m.name.split(' ')[0]).join(', ')} og dig` : '';

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[msg.header, { paddingTop: layout.topGap + insets.top }]}>
        <BackButton fallback="/beskeder" />
        {conv && (
          <Pressable
            accessibilityRole={direct ? 'link' : undefined}
            accessibilityLabel={direct ? `Gå til ${title}` : title}
            disabled={!direct}
            onPress={() => direct && router.push(`/bruger/${members[0]!.username}`)}
            style={s.who}
          >
            <Avatar name={title} path={direct ? members[0]!.avatar_path : null} tone={circle ? 'sage' : 'sand'} />
            <View style={s.title}>
              <T v="headingM" numberOfLines={1}>
                {title}
              </T>
              {circle && (
                <T v="caption" c={color.textSecondary} numberOfLines={1}>
                  {memberLine}
                </T>
              )}
            </View>
          </Pressable>
        )}
      </View>

      {missing ? (
        <View style={s.center}>
          <T v="bodyS" c={color.textSecondary}>
            Samtalen findes ikke længere.
          </T>
        </View>
      ) : (
        <ScrollView
          ref={listRef}
          style={{ flex: 1 }}
          contentContainerStyle={[s.list, circle && { paddingTop: 8 }]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          accessibilityLabel={`Beskeder med ${title}`}
        >
          {direct && theyPending && (
            <View style={s.centerRow}>
              <T v="caption" c={color.textSecondary} style={s.request}>
                {iWrote
                  ? `Sendt som anmodning. ${title} ser din besked, når de godkender den.`
                  : `${title} følger dig ikke, så din besked sendes som en anmodning.`}
              </T>
            </View>
          )}
          {messages.map((m) => {
            const out = m.sender_id === me.id;
            const who = out ? { name: me.name || 'Dig', avatar_path: me.avatar_path } : byId.get(m.sender_id) ?? { name: 'Tidligere medlem', avatar_path: null };
            return (
              <View key={m.id} style={[s.line, out && s.lineOut]}>
                <Avatar name={who.name} path={who.avatar_path} size="S" tone={out ? 'blue' : 'sand'} />
                <View style={[s.row, out && s.rowOut]}>
                  <T v="micro" c={color.textSecondary}>
                    {out ? 'Dig' : who.name.split(' ')[0]}
                  </T>
                  <View style={[s.bubble, out ? s.bubbleOut : s.bubbleIn]}>
                    {!!m.listing_id && <ListingContext listingId={m.listing_id} inBubble mine={out} />}
                    {!!m.post_id && <SharedPost id={m.post_id} compact onDark={out} />}
                    {!!m.body && (
                      <T v="bodyS" c={out ? color.textOnAction : color.textPrimary}>
                        {m.body}
                      </T>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {!missing &&
        (pending ? (
          <View style={[s.pending, { paddingBottom: Math.max(18, insets.bottom) }]}>
            <T v="caption" c={color.textSecondary} style={{ textAlign: 'center' }}>
              {title.split(' ')[0]} følger dig ikke. Godkend for at svare.
            </T>
            <View style={s.pendingButtons}>
              <Button title="Slet" variant="secondary" style={{ flex: 1 }} onPress={decline} />
              <Button title="Godkend" style={{ flex: 1 }} onPress={accept} />
            </View>
          </View>
        ) : (
          <View style={[msg.composer, { paddingBottom: Math.max(18, insets.bottom) }]}>
            {!!error && (
              <T v="caption" c={color.danger} style={s.error}>
                {error}
              </T>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <TextField
                label={circle ? 'Skriv til cirklen' : 'Skriv en besked'}
                showLabel={false}
                value={text}
                onChangeText={setText}
                maxLength={4000}
                onSubmitEditing={send}
                submitBehavior="submit"
                returnKeyType="send"
                onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300)}
              />
            </View>
            <IconButton icon="send" label="Send" variant="filled" disabled={!text.trim() || sending} onPress={send} style={!text.trim() ? { opacity: 0.4 } : undefined} />
          </View>
        ))}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  title: { flex: 1, minWidth: 0, gap: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  /* .msg-chat__list */
  list: { gap: 10, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 },
  centerRow: { flexDirection: 'row', justifyContent: 'center' },
  request: { maxWidth: 300, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.bgSubtle, textAlign: 'center', overflow: 'hidden' },
  /* Profilbillede ud for hver besked: til venstre for andres, til højre for dine egne */
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  lineOut: { flexDirection: 'row-reverse' },
  row: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 3 },
  rowOut: { alignItems: 'flex-end' },
  /* Message bubble: 258 px bred, 85 % højst */
  bubble: { width: 258, maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  bubbleIn: { backgroundColor: color.bgSubtle },
  bubbleOut: { backgroundColor: color.actionPrimary },
  error: { position: 'absolute', top: -20, left: 24 },
  pending: { gap: 10, paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgSurface },
  pendingButtons: { flexDirection: 'row', gap: 8 },
});
