import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { MintTile } from '@/components/CreateFlow';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { ListingContext } from '@/components/ListingContext';
import { msg } from '@/components/MessageParts';
import { SharedPost } from '@/components/SharedPost';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { noOutline } from '@/components/TextField';
import { callLabel, startCall, useCall } from '@/lib/calls';
import { conversationTitle, markRead, myConversations, type ConversationRow } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';
import { color, font, layout, radius } from '@/theme/tokens';

type Msg = Message & {
  listing_id?: string | null;
  post_id?: string | null;
  kind?: 'text' | 'call';
  call?: { video?: boolean; status?: string; seconds?: number } | null;
};

/** Beskeder fra samme person inden for 5 minutter samles i én gruppe */
const GROUP_MS = 5 * 60 * 1000;
/** Tidspunkt mellem beskederne, når der er gået mere end 30 minutter */
const GAP_MS = 30 * 60 * 1000;

const two = (n: number) => String(n).padStart(2, '0');
/** "I dag 14.05", "I går 09.12", "Man. 12.30", "12. nov. 14.00" */
function stamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const time = `${two(d.getHours())}.${two(d.getMinutes())}`;
  if (diff <= 0) return `I dag ${time}`;
  if (diff === 1) return `I går ${time}`;
  if (diff < 7) return `${['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'][d.getDay()]}. ${time}`;
  const months = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  return `${d.getDate()}. ${months[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''} ${time}`;
}
const clock = (iso: string) => {
  const d = new Date(iso);
  return `${two(d.getHours())}.${two(d.getMinutes())}`;
};

/** Samtale (1:1) eller cirkel. Skrivefeltet ligger nederst, listen starter ved den nyeste besked. */
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const activeCall = useCall();
  const [conv, setConv] = useState<ConversationRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  // Har modtageren (endnu) ikke godkendt? Så er det, du skriver, en anmodning.
  const [theyPending, setTheyPending] = useState(false);
  // Hvornår den anden sidst læste (til "Set")
  const [theirRead, setTheirRead] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [text, setText] = useState('');
  const [inputH, setInputH] = useState(22);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<Msg | null>(null);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const lastTyping = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConv = useCallback(async () => {
    const all = await myConversations().catch(() => []);
    const c = all.find((x) => x.id === id) ?? null;
    setConv(c);
    setMissing(!c);
    const { data } = await supabase.from('conversation_members').select('user_id, is_request, last_read_at').eq('conversation_id', id).neq('user_id', me.id);
    const others = (data ?? []) as { user_id: string; is_request: boolean; last_read_at: string }[];
    setTheyPending(others.length === 1 && !!others[0]!.is_request);
    setTheirRead(others.length === 1 ? others[0]!.last_read_at : null);
    if (others.length === 1) {
      const { data: b } = await supabase.from('blocks').select('blocked_id').or(`and(blocker_id.eq.${me.id},blocked_id.eq.${others[0]!.user_id}),and(blocker_id.eq.${others[0]!.user_id},blocked_id.eq.${me.id})`);
      setBlocked((b ?? []).length > 0);
    }
  }, [id, me.id]);

  const read = useCallback(() => {
    markRead(id, me.id);
    chRef.current?.send({ type: 'broadcast', event: 'read', payload: { user: me.id, at: new Date().toISOString() } });
  }, [id, me.id]);

  useEffect(() => {
    loadConv();
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => setMessages(((data ?? []) as Msg[]).reverse()));

    const ch = supabase
      .channel(`conv-${id}`, { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as Msg;
        setMessages((list) => (!list || list.some((x) => x.id === m.id) ? list : [...list, m]));
        if (m.sender_id !== me.id) {
          setTyping(null);
          read();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => {
        const gone = (p.old as { id?: string }).id;
        if (gone) setMessages((list) => list?.filter((x) => x.id !== gone) ?? list);
      })
      // Skriver … og Set (sendes direkte mellem telefonerne, gemmes ikke)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user === me.id) return;
        setTyping(payload.name ?? 'Nogen');
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 4000);
      })
      .on('broadcast', { event: 'read' }, ({ payload }) => {
        if (payload.user !== me.id) setTheirRead(payload.at);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') read();
      });
    chRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      chRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [id, me.id, loadConv, read]);

  const onType = (v: string) => {
    setText(v);
    const now = Date.now();
    if (v.trim() && now - lastTyping.current > 2000) {
      lastTyping.current = now;
      chRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user: me.id, name: me.name.split(' ')[0] } });
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    setText('');
    setInputH(22);
    lastTyping.current = 0;
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: me.id, body }).select().single();
    setSending(false);
    if (error) {
      setText(body);
      setError(blocked ? 'Du kan ikke skrive til denne person.' : 'Beskeden kunne ikke sendes. Prøv igen.');
      return;
    }
    setMessages((list) => (!list || list.some((x) => x.id === data.id) ? list : [...list, data as Msg]));
    // At svare accepterer en anmodning
    if (conv?.is_request) setConv({ ...conv, is_request: false });
  };

  // På computer: Enter sender, Shift+Enter giver ny linje
  const onKey = (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault: () => void }) => {
    const ne = e.nativeEvent;
    if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const accept = async () => {
    await supabase.from('conversation_members').update({ is_request: false }).eq('conversation_id', id).eq('user_id', me.id);
    if (conv) setConv({ ...conv, is_request: false });
  };

  const decline = async () => {
    await supabase.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', me.id);
    router.canGoBack() ? router.back() : router.replace('/beskeder');
  };

  const remove = async (m: Msg) => {
    setMenu(null);
    setMessages((list) => list?.filter((x) => x.id !== m.id) ?? list);
    const { error } = await supabase.from('messages').delete().eq('id', m.id);
    if (error) setMessages((list) => (list ? [...list, m].sort((a, b) => a.created_at.localeCompare(b.created_at)) : list));
  };

  const copy = async (m: Msg) => {
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(m.body);
      else await Share.share({ message: m.body });
    } catch {}
    setMenu(null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const members = conv?.members ?? [];
  const circle = !!conv && (conv.is_group || members.length > 1);
  const direct = !circle && members.length === 1;
  const other = direct ? members[0]! : null;
  const title = conv ? conversationTitle(conv) : '';
  const byId = new Map(members.map((m) => [m.id, m]));
  const list = messages ?? [];
  const pending = !!conv?.is_request && list.some((m) => m.sender_id !== me.id);
  const iWrote = list.some((m) => m.sender_id === me.id);
  const sub = typing ? `${circle ? `${typing} ` : ''}skriver …` : circle ? `${members.map((m) => m.name.split(' ')[0]).join(', ')} og dig` : other ? `@${other.username}` : '';
  const canCall = direct && !blocked && !theyPending && !pending;
  const call = (video: boolean) => other && conv && startCall({ id: other.id, name: other.name, username: other.username, avatar_path: other.avatar_path }, conv.id, video);
  // Sidste besked, du sendte (til "Sendt"/"Set")
  const lastMine = [...list].reverse().find((m) => m.sender_id === me.id && m.kind !== 'call');
  const seen = !!lastMine && !!theirRead && theirRead >= lastMine.created_at && list[list.length - 1]?.id === lastMine.id;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[msg.header, s.header, { paddingTop: layout.topGap + insets.top }]}>
        <BackButton fallback="/beskeder" />
        {conv && (
          <Pressable
            accessibilityRole={direct ? 'link' : undefined}
            accessibilityLabel={direct ? `Gå til profilen for ${title}` : title}
            disabled={!direct}
            onPress={() => other && router.push(`/bruger/${other.username}`)}
            style={({ pressed }) => [s.who, pressed && { opacity: 0.7 }]}
          >
            <Avatar name={title} path={other?.avatar_path ?? null} tone={circle ? 'sage' : 'sand'} />
            <View style={s.title}>
              <T v="headingS" numberOfLines={1}>
                {title}
              </T>
              {!!sub && (
                <T v="caption" c={typing ? color.green700 : color.textSecondary} numberOfLines={1}>
                  {sub}
                </T>
              )}
            </View>
          </Pressable>
        )}
        {canCall && (
          <>
            <IconButton icon="phone" label={`Ring til ${title}`} variant="outline" disabled={!!activeCall} onPress={() => call(false)} />
            <IconButton icon="video" label={`Videoopkald med ${title}`} variant="outline" disabled={!!activeCall} onPress={() => call(true)} />
          </>
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
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          accessibilityLabel={`Beskeder med ${title}`}
        >
          {/* Øverst: hvem man skriver med */}
          {messages !== null && conv && (
            <View style={s.intro}>
              <Avatar name={title} path={other?.avatar_path ?? null} size={72} tone={circle ? 'sage' : 'sand'} />
              <T v="headingM" style={{ textAlign: 'center' }}>
                {title}
              </T>
              <T v="caption" c={color.textSecondary} style={{ textAlign: 'center' }}>
                {circle ? `Cirkel · ${members.length + 1} medlemmer` : other ? `@${other.username}` : ''}
              </T>
              {other && (
                <Pressable accessibilityRole="link" onPress={() => router.push(`/bruger/${other.username}`)} style={({ pressed }) => [s.introBtn, pressed && { opacity: 0.8 }]}>
                  <T v="captionStrong">Se profil</T>
                </Pressable>
              )}
            </View>
          )}

          {direct && theyPending && (
            <View style={s.note}>
              <T v="caption" c={color.textSecondary} style={{ textAlign: 'center' }}>
                {iWrote ? `Sendt som anmodning. ${title} ser din besked, når de godkender den.` : `${title} følger dig ikke, så din besked sendes som en anmodning.`}
              </T>
            </View>
          )}

          {list.map((m, i) => {
            const prev = list[i - 1];
            const next = list[i + 1];
            const out = m.sender_id === me.id;
            const t = new Date(m.created_at).getTime();
            const showStamp = !prev || t - new Date(prev.created_at).getTime() > GAP_MS;
            const isCall = m.kind === 'call';
            const sameAsPrev = !!prev && !showStamp && prev.sender_id === m.sender_id && prev.kind !== 'call' && t - new Date(prev.created_at).getTime() < GROUP_MS;
            const nextStamp = !!next && new Date(next.created_at).getTime() - t > GAP_MS;
            const sameAsNext = !!next && !nextStamp && next.sender_id === m.sender_id && next.kind !== 'call' && new Date(next.created_at).getTime() - t < GROUP_MS;
            const who = byId.get(m.sender_id) ?? { name: 'Tidligere medlem', avatar_path: null, username: '' };

            return (
              <View key={m.id}>
                {showStamp && (
                  <T v="micro" c={color.textSecondary} style={s.stamp}>
                    {stamp(m.created_at)}
                  </T>
                )}
                {isCall ? (
                  <View style={s.callRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${callLabel(m.call, out)}, ${clock(m.created_at)}. Ring op igen`}
                      disabled={!canCall || !!activeCall}
                      onPress={() => call(!!m.call?.video)}
                      style={({ pressed }) => [s.callPill, pressed && { opacity: 0.8 }]}
                    >
                      <View style={[s.callIcon, m.call?.status !== 'ended' && !out && s.callIconMissed]}>
                        <Icon name={m.call?.video ? 'video' : 'phone'} size={14} color={m.call?.status !== 'ended' && !out ? color.danger : color.green700} />
                      </View>
                      <View>
                        <T v="captionStrong">{callLabel(m.call, out)}</T>
                        <T v="micro" c={color.textSecondary}>
                          {clock(m.created_at)}
                          {canCall ? ' · Tryk for at ringe op' : ''}
                        </T>
                      </View>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[s.line, out && s.lineOut, sameAsPrev ? { marginTop: 2 } : { marginTop: 10 }]}>
                    {/* Andres billede ved den sidste besked i en gruppe */}
                    {!out && <View style={s.avatarSlot}>{!sameAsNext && <Avatar name={who.name} path={who.avatar_path} size={28} tone="sand" />}</View>}
                    <View style={[s.col, out && s.colOut]}>
                      {circle && !out && !sameAsPrev && (
                        <T v="micro" c={color.textSecondary} style={s.sender}>
                          {who.name.split(' ')[0]}
                        </T>
                      )}
                      <Pressable
                        onLongPress={() => setMenu(m)}
                        delayLongPress={350}
                        accessibilityHint="Hold nede for flere muligheder"
                        style={[
                          s.bubble,
                          out ? s.bubbleOut : s.bubbleIn,
                          out ? { borderTopRightRadius: sameAsPrev ? 6 : 20, borderBottomRightRadius: sameAsNext ? 6 : 20 } : { borderTopLeftRadius: sameAsPrev ? 6 : 20, borderBottomLeftRadius: sameAsNext ? 6 : 20 },
                          (m.post_id || m.listing_id) && s.bubbleMedia,
                        ]}
                      >
                        {!!m.listing_id && <ListingContext listingId={m.listing_id} inBubble mine={out} />}
                        {!!m.post_id && <SharedPost id={m.post_id} compact onDark={out} />}
                        {!!m.body && !(m.post_id && m.body.startsWith('Delte et opslag')) && (
                          <T v="body" c={out ? color.textOnAction : color.textPrimary} style={(m.post_id || m.listing_id) && { paddingHorizontal: 4, paddingBottom: 2 }}>
                            {m.body}
                          </T>
                        )}
                      </Pressable>
                      {!sameAsNext && (
                        <T v="micro" c={color.textSecondary} style={s.time}>
                          {clock(m.created_at)}
                          {direct && lastMine?.id === m.id ? (seen ? ' · Set' : ' · Sendt') : ''}
                        </T>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {messages !== null && list.length === 0 && !theyPending && (
            <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
              Sig hej til {title.split(' ')[0]} 👋
            </T>
          )}

          {!!typing && (
            <View style={[s.line, { marginTop: 10 }]} accessibilityLabel={`${typing} skriver`}>
              <View style={s.avatarSlot} />
              <View style={[s.bubble, s.bubbleIn, s.typing]}>
                <Dots />
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {!missing &&
        (pending ? (
          <View style={[s.pending, { paddingBottom: Math.max(16, insets.bottom) }]}>
            <View style={s.pendingHead}>
              <MintTile icon="user-plus" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="headingS">Beskedanmodning</T>
                <T v="caption" c={color.textSecondary}>
                  {title.split(' ')[0]} følger dig ikke. Godkend for at svare.
                </T>
              </View>
            </View>
            <View style={s.pendingButtons}>
              <Button title="Slet" variant="secondary" style={{ flex: 1 }} onPress={decline} />
              <Button title="Godkend" style={{ flex: 1 }} onPress={accept} />
            </View>
          </View>
        ) : blocked && direct ? (
          <View style={[s.pending, { paddingBottom: Math.max(16, insets.bottom) }]}>
            <T v="caption" c={color.textSecondary} style={{ textAlign: 'center' }}>
              Du kan ikke skrive i denne samtale.
            </T>
          </View>
        ) : (
          <View style={[s.composer, { paddingBottom: Math.max(12, insets.bottom) }]}>
            {!!error && (
              <T v="caption" c={color.danger} style={s.error} accessibilityLiveRegion="polite">
                {error}
              </T>
            )}
            <View style={s.field}>
              <TextInput
                accessibilityLabel={circle ? 'Skriv til cirklen' : 'Skriv en besked'}
                placeholder={circle ? 'Skriv til cirklen …' : 'Skriv en besked …'}
                placeholderTextColor={color.textSecondary}
                value={text}
                onChangeText={onType}
                onKeyPress={onKey as never}
                multiline
                maxLength={4000}
                onContentSizeChange={(e) => setInputH(Math.min(110, Math.max(22, e.nativeEvent.contentSize.height)))}
                onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300)}
                style={[s.input, noOutline, { height: inputH }]}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !text.trim() || sending }}
              disabled={!text.trim() || sending}
              onPress={send}
              style={({ pressed }) => [s.send, !text.trim() && s.sendOff, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Icon name="send" size={20} color={text.trim() ? color.ink900 : color.textSecondary} />
            </Pressable>
          </View>
        ))}

      {/* Hold nede på en besked: kopiér eller slet (egne) */}
      <Sheet open={!!menu} onClose={() => setMenu(null)} dim>
        {menu && (
          <View style={s.menu}>
            <View style={s.menuPreview}>
              <T v="bodyS" numberOfLines={3}>
                {menu.body}
              </T>
            </View>
            <View style={s.menuCard}>
              <MenuRow icon="note" label="Kopiér tekst" onPress={() => copy(menu)} />
              {menu.sender_id === me.id && <MenuRow icon="close" label="Slet besked" danger onPress={() => remove(menu)} first={false} />}
            </View>
          </View>
        )}
      </Sheet>

      {copied && (
        <View style={[s.toast, { bottom: 90 + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <T v="captionStrong" c={color.white}>
            Kopieret
          </T>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function MenuRow({ icon, label, onPress, danger, first = true }: { icon: 'note' | 'close'; label: string; onPress: () => void; danger?: boolean; first?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.menuRow, !first && s.menuLine, pressed && { backgroundColor: color.bgSubtle }]}>
      <MintTile icon={icon} tone={danger ? 'danger' : 'mint'} />
      <T v="label" c={danger ? color.danger : color.textPrimary} style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}

/** Tre prikker, der vipper (nogen skriver) */
function Dots() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % 3), 380);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={s.dots}>
      {[0, 1, 2].map((d) => (
        <View key={d} style={[s.dot, { opacity: d === i ? 0.9 : 0.35, transform: [{ translateY: d === i ? -2 : 0 }] }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  header: { borderBottomWidth: 1, borderBottomColor: color.borderDefault },
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  title: { flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { paddingTop: 8, paddingHorizontal: 14, paddingBottom: 14 },
  intro: { alignItems: 'center', gap: 4, paddingTop: 18, paddingBottom: 10 },
  introBtn: { marginTop: 8, minHeight: 32, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  note: { alignSelf: 'center', maxWidth: 300, marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.bgSubtle },
  stamp: { textAlign: 'center', marginTop: 18, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  lineOut: { justifyContent: 'flex-end' },
  avatarSlot: { width: 28 },
  col: { maxWidth: '78%', alignItems: 'flex-start' },
  colOut: { alignItems: 'flex-end' },
  sender: { marginLeft: 12, marginBottom: 2 },
  bubble: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20 },
  bubbleIn: { backgroundColor: color.bgSurface, borderWidth: 1, borderColor: color.borderDefault },
  bubbleOut: { backgroundColor: color.actionPrimary },
  bubbleMedia: { padding: 4, gap: 4, minWidth: 220 },
  time: { marginTop: 3, marginHorizontal: 6 },
  typing: { paddingVertical: 12 },
  dots: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.ink600 },
  callRow: { alignItems: 'center', marginTop: 10 },
  callPill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  callIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: color.noteBg },
  callIconMissed: { backgroundColor: '#fdecec' },
  composer: { flexShrink: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgSurface },
  field: { flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, backgroundColor: color.bgSubtle },
  input: { color: color.textPrimary, fontFamily: font.body, fontSize: 16, lineHeight: 22, padding: 0, textAlignVertical: 'top' },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.accent },
  sendOff: { backgroundColor: color.bgSubtle },
  error: { position: 'absolute', top: -22, left: 24 },
  pending: { gap: 12, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgSurface },
  pendingHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingButtons: { flexDirection: 'row', gap: 8 },
  menu: { gap: 12, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 16 },
  menuPreview: { padding: 12, borderRadius: radius.lg, backgroundColor: color.bgSubtle },
  menuCard: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14 },
  menuLine: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  toast: { position: 'absolute', alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: color.ink900 },
});
