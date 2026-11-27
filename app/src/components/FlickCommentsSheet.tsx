import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago, ageMinutes } from '@/lib/time';
import { color, font, radius, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { CommentSort, type CommentOrder } from './CommentSort';
import { Icon } from './Icon';
import { T } from './T';
import { noOutline } from './TextField';

type Row = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  author_username: string;
  author_name: string;
  author_avatar_path: string | null;
  likes: number;
  liked: boolean;
  replies: number;
};

const SHEET = '#141414';
const MUTED = 'rgba(255,255,255,0.55)';

/** Kommentarer over en flick: mørkt ark, svar, hjerter og sortering (som opslag) */
export function FlickCommentsSheet({ postId, onClose, onCount }: { postId: string | null; onClose: () => void; onCount?: (n: number) => void }) {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>([]);
  const [order, setOrder] = useState<CommentOrder>('relevante');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Row | null>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    const { data } = await supabase.from('comment_cards').select('*').eq('post_id', postId);
    const list = ((data ?? []) as Row[]).map((r) => ({ ...r, likes: Number(r.likes), replies: Number(r.replies) }));
    setRows(list);
    onCount?.(list.length);
  }, [postId, onCount]);

  useEffect(() => {
    setRows([]);
    setReplyTo(null);
    setText('');
    load();
  }, [load]);

  // Tråde: kommentar med svar under, sorteret efter valget
  const threads = useMemo(() => {
    const top = rows.filter((r) => !r.parent_id);
    const score = (r: Row) => (r.likes + r.replies * 2 + 1) / Math.pow(ageMinutes(r.created_at) / 60 + 2, 1.2);
    const sorted = [...top].sort((a, b) =>
      order === 'relevante'
        ? score(b) - score(a)
        : order === 'omdiskuterede'
          ? b.replies - a.replies || b.likes - a.likes
          : order === 'nyeste'
            ? b.created_at.localeCompare(a.created_at)
            : a.created_at.localeCompare(b.created_at),
    );
    return sorted.flatMap((t) => [t, ...rows.filter((r) => r.parent_id === t.id).sort((a, b) => a.created_at.localeCompare(b.created_at))]);
  }, [rows, order]);

  const send = async () => {
    const t = text.trim();
    if (!t || !postId) return;
    setText('');
    const parent = replyTo ? (replyTo.parent_id ?? replyTo.id) : null;
    setReplyTo(null);
    await supabase.from('comments').insert({ post_id: postId, author_id: me.id, parent_id: parent, text: t });
    load();
  };

  const like = async (c: Row) => {
    setRows((l) => l.map((r) => (r.id === c.id ? { ...r, liked: !c.liked, likes: r.likes + (c.liked ? -1 : 1) } : r)));
    if (c.liked) await supabase.from('comment_likes').delete().eq('comment_id', c.id).eq('user_id', me.id);
    else await supabase.from('comment_likes').insert({ comment_id: c.id, user_id: me.id });
  };

  const remove = async (c: Row) => {
    await supabase.from('comments').delete().eq('id', c.id);
    load();
  };

  return (
    <Modal visible={!!postId} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Luk kommentarer" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={s.handle} />
        <T v="headingM" c="#fff" style={s.title} accessibilityRole="header">
          Kommentarer
        </T>
        {rows.length > 1 && (
          <View style={s.sortWrap}>
            <CommentSort value={order} onChange={setOrder} />
          </View>
        )}
        <FlatList
          data={threads}
          keyExtractor={(r) => r.id}
          style={{ flexGrow: 0, maxHeight: 420 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8, gap: 16 }}
          ListEmptyComponent={
            <T v="bodyS" c={MUTED} style={{ textAlign: 'center', paddingVertical: 28 }}>
              Ingen kommentarer endnu
            </T>
          }
          renderItem={({ item: c }) => (
            <View style={[s.row, c.parent_id && { paddingLeft: 44 }]}>
              <Pressable onPress={() => (onClose(), router.push(c.author_id === me.id ? '/profil' : `/bruger/${c.author_username}`))}>
                <Avatar name={c.author_name} path={c.author_avatar_path} size={c.parent_id ? 24 : 'M'} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="captionStrong" c="#fff">
                  {c.author_name}{' '}
                  <T v="caption" c={MUTED}>
                    · {ago(c.created_at)}
                  </T>
                </T>
                <T v="bodyS" c="#fff">
                  {c.text}
                </T>
                <View style={s.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setReplyTo(c);
                      setText(`@${c.author_name.split(' ')[0]} `);
                      input.current?.focus();
                    }}
                    style={s.textBtn}
                  >
                    <T v="captionStrong" c={MUTED}>
                      Svar
                    </T>
                  </Pressable>
                  {c.author_id === me.id && (
                    <Pressable accessibilityRole="button" onPress={() => remove(c)} style={s.textBtn}>
                      <T v="captionStrong" c={MUTED}>
                        Slet
                      </T>
                    </Pressable>
                  )}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Synes godt om${c.likes ? `: ${c.likes}` : ''}`}
                accessibilityState={{ selected: c.liked }}
                onPress={() => like(c)}
                style={s.like}
              >
                <Icon name={c.liked ? 'heart-filled' : 'heart'} size={18} color={c.liked ? '#fff' : MUTED} />
                {c.likes > 0 && (
                  <T v="caption" c={MUTED}>
                    {c.likes}
                  </T>
                )}
              </Pressable>
            </View>
          )}
        />
        {replyTo && (
          <View style={s.replying}>
            <T v="caption" c={MUTED} style={{ flex: 1 }}>
              Svarer {replyTo.author_name.split(' ')[0]}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Fortryd svar" onPress={() => (setReplyTo(null), setText(''))} style={s.textBtn}>
              <Icon name="close" size={16} color={MUTED} />
            </Pressable>
          </View>
        )}
        <View style={s.composer}>
          <Avatar name={me.name} path={me.avatar_path} size={24} />
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            placeholder="Tilføj en kommentar"
            placeholderTextColor={MUTED}
            accessibilityLabel="Tilføj en kommentar"
            onSubmitEditing={send}
            returnKeyType="send"
            style={[s.field, noOutline]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!text.trim()} onPress={send} style={[s.send, !text.trim() && { opacity: 0.4 }]}>
            <Icon name="send" size={18} color="#000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: SHEET, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 6 },
  title: { textAlign: 'center', paddingVertical: 8 },
  sortWrap: { paddingHorizontal: 8 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: 4 },
  textBtn: { minHeight: 32, minWidth: 32, justifyContent: 'center', paddingRight: 8 },
  like: { minWidth: TAP, minHeight: TAP, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  replying: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  field: {
    flex: 1,
    minHeight: TAP,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontFamily: font.body,
    fontSize: 16,
  },
  send: { width: TAP, height: TAP, borderRadius: TAP / 2, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
});
