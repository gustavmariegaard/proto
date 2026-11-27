import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { matches, msg, threadTime } from '@/components/MessageParts';
import { PageHeader } from '@/components/PageHeader';
import { T } from '@/components/T';
import { Tag } from '@/components/Tag';
import { TextField } from '@/components/TextField';
import { conversationTitle, isUnread, myConversations, type ConversationRow } from '@/lib/conversations';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@/theme/tokens';

type Tab = 'alle' | 'personer' | 'cirkler' | 'anmodninger';

const tabs: { value: Tab; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'personer', label: 'Personer' },
  { value: 'cirkler', label: 'Cirkler' },
  { value: 'anmodninger', label: 'Anmodninger' },
];

/** En cirkel: gruppesamtale (flere end én anden, eller med navn) */
const isCircle = (c: ConversationRow) => c.is_group || c.members.length > 1;

/** Beskeder: alle samtaler, filtreret med Alle / Personer / Cirkler / Anmodninger (som prototypen) */
export default function Messages() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vis?: string }>();
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
      .channel(`inbox-${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me.id, load]);

  /** Forhåndsvisning: "Du: …" for dine egne, "Mette: …" i cirkler */
  const preview = (c: ConversationRow) => {
    if (!c.last_body) return '';
    if (c.last_sender_id === me.id) return `Du: ${c.last_body}`;
    if (isCircle(c)) {
      const who = c.members.find((m) => m.id === c.last_sender_id);
      return who ? `${who.name.split(' ')[0]}: ${c.last_body}` : c.last_body;
    }
    return c.last_body;
  };

  // Kun samtaler med beskeder (og nye cirkler). Anmodning: jeg er markeret som anmodning.
  const all = (rows ?? []).filter((c) => c.has_messages || (c.is_group && !c.is_request));
  const shown = all.filter(
    (c) =>
      (tab === 'alle' || (tab === 'anmodninger' ? c.is_request : tab === 'personer' ? !isCircle(c) && !c.is_request : isCircle(c))) &&
      (!query.trim() || matches(conversationTitle(c), query) || matches(preview(c), query)),
  );

  return (
    <View style={s.screen}>
      <PageHeader title="Beskeder" fallback="/">
        <IconButton icon="edit" label="Ny besked" variant="filled" onPress={() => router.push('/ny-besked')} />
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
        <TextField label="Søg i beskeder" showLabel={false} value={query} onChangeText={setQuery} autoCorrect={false} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs} accessibilityLabel="Vis beskeder fra">
          {tabs.map((t) => (
            <Chip key={t.value} selected={t.value === tab} onPress={() => setTab(t.value)}>
              {t.label}
            </Chip>
          ))}
        </ScrollView>

        {tab === 'anmodninger' && (
          <T v="bodyS" c={color.textSecondary}>
            Beskeder fra folk, du ikke følger. Du kan svare, når du har godkendt anmodningen.
          </T>
        )}

        {tab === 'cirkler' && (
          <T v="bodyS" c={color.textSecondary}>
            Cirkler er private grupper med chat. Kun medlemmer kan se dem.
          </T>
        )}

        {rows === null ? null : shown.length > 0 ? (
          <View style={s.list}>
            {shown.map((c) => {
              const unread = isUnread(c, me.id);
              const title = conversationTitle(c);
              const circle = isCircle(c);
              const direct = !circle ? c.members[0] : undefined;
              const text = preview(c);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="link"
                  accessibilityLabel={`${title}${unread ? ', ulæst' : ''}`}
                  onPress={() => router.push(`/samtale/${c.id}`)}
                  style={({ pressed }) => [msg.card, pressed && { backgroundColor: color.bgSunken }]}
                >
                  <Avatar name={title} path={direct?.avatar_path} size="L" tone={circle ? 'sage' : 'sand'} />
                  <View style={[msg.cardText, circle && { gap: 3 }]}>
                    <T v="headingS" numberOfLines={1}>
                      {title}
                    </T>
                    {!!text && (
                      <T v="caption" c={color.textSecondary} numberOfLines={1}>
                        {text}
                      </T>
                    )}
                    {c.is_request && <Tag>Anmodning</Tag>}
                  </View>
                  <View style={s.meta}>
                    <T v="caption" c={color.textSecondary}>
                      {threadTime(c.last_message_at)}
                    </T>
                    <View style={[s.dot, unread && s.dotOn]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <T v="bodyS" c={color.textSecondary} style={{ textAlign: 'center' }}>
            Ingen beskeder fundet
          </T>
        )}

        {tab === 'cirkler' && <Button title="Ny cirkel" block onPress={() => router.push('/ny-cirkel')} />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bgApp },
  tabsScroll: { marginHorizontal: -20, flexGrow: 0 },
  tabs: { gap: 8, paddingHorizontal: 20 },
  list: { gap: 14 },
  meta: { flexShrink: 0, alignItems: 'flex-end', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: color.accentHighlight },
});
