import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { MintTile } from '@/components/CreateFlow';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { matches, msg, threadTime } from '@/components/MessageParts';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { T } from '@/components/T';
import { TextField } from '@/components/TextField';
import { callLabel } from '@/lib/calls';
import { conversationTitle, isUnread, myConversations, type ConversationRow } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { color, font, radius } from '@/theme/tokens';

type Tab = 'alle' | 'personer' | 'cirkler';

const tabs = [
  { value: 'alle', label: 'Alle' },
  { value: 'personer', label: 'Personer' },
  { value: 'cirkler', label: 'Cirkler' },
] as const;

/** En cirkel: gruppesamtale (flere end én anden, eller med navn) */
const isCircle = (c: ConversationRow) => c.is_group || c.members.length > 1;

/**
 * Beskeder: dine samtaler, nyeste først. Ulæste står med fed og en grøn prik.
 * Anmodninger (fra folk, du ikke følger) samles i én række øverst og åbnes for sig (?vis=anmodninger).
 */
export default function Messages() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vis?: string }>();
  const requestsView = params.vis === 'anmodninger';
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [tab, setTab] = useState<Tab>(tabs.find((t) => t.value === params.vis)?.value ?? 'alle');
  const [query, setQuery] = useState('');
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
      .channel(`inbox-${me.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me.id, load]);

  /** Forhåndsvisning: "Du: …" for dine egne, "Mette: …" i cirkler, opkald som tekst */
  const preview = (c: ConversationRow) => {
    if (c.last_kind === 'call') return callLabel(c.last_call, c.last_sender_id === me.id);
    if (!c.last_body) return isCircle(c) ? 'Ny cirkel. Skriv den første besked.' : '';
    if (c.last_sender_id === me.id) return `Du: ${c.last_body}`;
    if (isCircle(c)) {
      const who = c.members.find((m) => m.id === c.last_sender_id);
      return who ? `${who.name.split(' ')[0]}: ${c.last_body}` : c.last_body;
    }
    return c.last_body;
  };

  // Kun samtaler med beskeder (og nye cirkler)
  const all = (rows ?? []).filter((c) => c.has_messages || (c.is_group && !c.is_request));
  const requests = all.filter((c) => c.is_request);
  const q = query.trim();
  const shown = (requestsView ? requests : all.filter((c) => !c.is_request))
    .filter((c) => requestsView || tab === 'alle' || (tab === 'personer' ? !isCircle(c) : isCircle(c)))
    .filter((c) => !q || matches(conversationTitle(c), q) || c.members.some((m) => matches(m.username, q.replace(/^@/, ''))) || matches(preview(c), q));
  const unreadRequests = requests.filter((c) => isUnread(c, me.id)).length;

  return (
    <View style={s.screen}>
      <PageHeader title={requestsView ? 'Anmodninger' : 'Beskeder'} fallback={requestsView ? '/beskeder' : '/'}>
        {!requestsView && <IconButton icon="edit" label="Ny besked" variant="filled" onPress={() => router.push('/ny-besked')} />}
      </PageHeader>

      <ScrollView
        contentContainerStyle={[msg.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
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
        <TextField label={requestsView ? 'Søg i anmodninger' : 'Søg i beskeder'} showLabel={false} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" />

        {requestsView ? (
          <T v="bodyS" c={color.textSecondary}>
            Beskeder fra folk, du ikke følger. De kan ikke se, om du har læst dem, før du godkender.
          </T>
        ) : (
          <>
            <SegmentedControl label="Vis beskeder fra" options={tabs} value={tab} onChange={setTab} />
            {requests.length > 0 && !q && (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Anmodninger, ${requests.length}`}
                onPress={() => router.push({ pathname: '/beskeder', params: { vis: 'anmodninger' } })}
                style={({ pressed }) => [s.requests, pressed && { backgroundColor: color.bgSunken }]}
              >
                <MintTile icon="user-plus" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="headingS">Anmodninger</T>
                  <T v="caption" c={color.textSecondary} numberOfLines={1}>
                    {requests.length === 1 ? `${conversationTitle(requests[0]!)} vil skrive med dig` : `${requests.length} personer vil skrive med dig`}
                  </T>
                </View>
                {unreadRequests > 0 && (
                  <View style={s.badge}>
                    <T v="micro" c={color.ink900}>
                      {unreadRequests}
                    </T>
                  </View>
                )}
                <Icon name="chevron-right" size={18} color={color.textSecondary} />
              </Pressable>
            )}
          </>
        )}

        {rows === null ? null : shown.length > 0 ? (
          <View style={s.list}>
            {shown.map((c, i) => {
              const unread = isUnread(c, me.id);
              const title = conversationTitle(c);
              const circle = isCircle(c);
              const direct = !circle ? c.members[0] : undefined;
              const text = preview(c);
              const call = c.last_kind === 'call';
              const missed = call && c.last_sender_id !== me.id && c.last_call?.status !== 'ended';
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="link"
                  accessibilityLabel={`${title}${unread ? ', ulæst' : ''}. ${text}`}
                  onPress={() => router.push(`/samtale/${c.id}`)}
                  style={({ pressed }) => [s.row, i > 0 && s.rowLine, pressed && { backgroundColor: color.bgSunken }]}
                >
                  <Avatar name={title} path={direct?.avatar_path} size="L" tone={circle ? 'sage' : 'sand'} />
                  <View style={s.rowText}>
                    <View style={s.rowTop}>
                      <T v="headingS" numberOfLines={1} style={[{ flex: 1, minWidth: 0 }, !unread && { fontFamily: font.bodySemi }]}>
                        {title}
                      </T>
                      <T v="caption" c={unread ? color.textPrimary : color.textSecondary} style={unread && { fontFamily: font.bodySemi }}>
                        {threadTime(c.last_message_at)}
                      </T>
                    </View>
                    <View style={s.rowTop}>
                      {call && <Icon name={c.last_call?.video ? 'video' : 'phone'} size={13} color={missed ? color.danger : color.textSecondary} />}
                      <T v="caption" c={missed ? color.danger : unread ? color.textPrimary : color.textSecondary} numberOfLines={1} style={[{ flex: 1, minWidth: 0 }, unread && { fontFamily: font.bodySemi }]}>
                        {text}
                      </T>
                      {unread && <View style={s.dot} accessibilityLabel="Ulæst" />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={s.empty}>
            <MintTile icon="chat" size={48} />
            <T v="headingS" style={{ textAlign: 'center' }}>
              {q ? 'Ingen samtaler fundet' : requestsView ? 'Ingen anmodninger' : tab === 'cirkler' ? 'Ingen cirkler endnu' : 'Ingen beskeder endnu'}
            </T>
            <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center' }}>
              {q
                ? `Ingen samtaler passer til “${q}”.`
                : requestsView
                  ? 'Når nogen, du ikke følger, skriver til dig, kommer det her.'
                  : tab === 'cirkler'
                    ? 'Cirkler er private grupper med chat. Kun medlemmer kan se dem.'
                    : 'Skriv til en, du følger, eller start en cirkel.'}
            </T>
            {!q && !requestsView && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(tab === 'cirkler' ? '/ny-cirkel' : '/ny-besked')}
                style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.85 }]}
              >
                <T v="label" c={color.textOnAction}>
                  {tab === 'cirkler' ? 'Ny cirkel' : 'Skriv en besked'}
                </T>
              </Pressable>
            )}
          </View>
        )}

        {tab === 'cirkler' && !requestsView && shown.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/ny-cirkel')} style={({ pressed }) => [s.newCircle, pressed && { backgroundColor: color.bgSunken }]}>
            <MintTile icon="plus" />
            <T v="label">Ny cirkel</T>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  list: { overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowLine: { borderTopWidth: 1, borderTopColor: color.borderDefault },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.accentHighlight },
  requests: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: color.borderDefault, backgroundColor: color.bgSurface },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: color.accent },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 20 },
  emptyBtn: { marginTop: 8, minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.actionPrimary },
  newCircle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong },
});
