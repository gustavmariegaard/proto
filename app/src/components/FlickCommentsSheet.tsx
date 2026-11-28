import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import { color, font, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import type { CommentRow } from './CommentsSheet';
import { CommentSort, sortThreads, type CommentOrder } from './CommentSort';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';
import { noOutline } from './TextField';

type Props = { postId: string | null; onClose: () => void; onCount?: (n: number) => void };

const hit = { top: 14, bottom: 14, left: 8, right: 8 };

/**
 * Kommentarer over en flick (prototypens FlickCommentsSheet): lyst ark med mørk hinde,
 * sortering, svar der foldes ud ("Se 2 svar"), hjerter og et felt nederst.
 */
export function FlickCommentsSheet({ postId, onClose, onCount }: Props) {
  const me = useMe();
  const [list, setList] = useState<CommentRow[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [order, setOrder] = useState<CommentOrder>('relevante');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const load = useCallback(async () => {
    if (!postId) return [];
    const { data } = await supabase.from('comment_cards').select('*').eq('post_id', postId);
    const rows = ((data ?? []) as CommentRow[]).map((c) => ({ ...c, likes: Number(c.likes), replies: Number(c.replies) }));
    setList(rows);
    onCount?.(rows.length);
    return rows;
  }, [postId, onCount]);

  useEffect(() => {
    setList([]);
    setExpanded([]);
    setReplyTo(null);
    setText('');
    load();
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t || !postId) return;
    // Kun én tråd-dybde: svar på et svar hænger under den øverste kommentar
    const parent = replyTo ? (replyTo.parent_id ?? replyTo.id) : null;
    const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: me.id, parent_id: parent, text: t });
    if (error) return;
    setText('');
    setReplyTo(null);
    if (parent) setExpanded((e) => (e.includes(parent) ? e : [...e, parent]));
    load();
  };

  const remove = async (c: CommentRow) => {
    await supabase.from('comments').delete().eq('id', c.id);
    load();
  };

  const like = async (c: CommentRow) => {
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, liked: !c.liked, likes: x.likes + (c.liked ? -1 : 1) } : x)));
    if (c.liked) await supabase.from('comment_likes').delete().eq('comment_id', c.id).eq('user_id', me.id);
    else await supabase.from('comment_likes').insert({ comment_id: c.id, user_id: me.id });
  };

  const reply = (c: CommentRow) => {
    setReplyTo(c);
    setText(`@${c.author_name.split(' ')[0]} `);
    input.current?.focus();
  };

  const renderComment = (c: CommentRow) => {
    const own = c.author_id === me.id;
    const replies = list.filter((r) => r.parent_id === c.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const open = expanded.includes(c.id);
    return (
      <View key={c.id}>
        <View style={s.row}>
          <Avatar name={c.author_name} path={c.author_avatar_path} />
          <View style={s.text}>
            <T
              v="headingS"
              numberOfLines={1}
              accessibilityRole="link"
              onPress={() => {
                onClose();
                router.push(`/bruger/${c.author_username}`);
              }}
            >
              {c.author_name}
            </T>
            <T v="caption" c={color.textSecondary}>
              @{c.author_username} · {ago(c.created_at)}
            </T>
            <T v="bodyS">{c.text}</T>
            <View style={s.actions}>
              <Pressable accessibilityRole="button" onPress={() => reply(c)} hitSlop={hit}>
                <T v="captionStrong" c={color.textSecondary}>
                  Svar
                </T>
              </Pressable>
              {replies.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setExpanded((e) => (open ? e.filter((x) => x !== c.id) : [...e, c.id]))}
                  hitSlop={hit}
                >
                  <T v="captionStrong" c={color.textSecondary}>
                    {open ? 'Skjul svar' : `Se ${replies.length} svar`}
                  </T>
                </Pressable>
              )}
              {own && (
                <Pressable accessibilityRole="button" onPress={() => remove(c)} hitSlop={hit}>
                  <T v="captionStrong" c={color.textSecondary}>
                    Slet
                  </T>
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: c.liked }}
            accessibilityLabel={`Synes godt om${c.likes ? `, ${c.likes}` : ''}`}
            onPress={() => like(c)}
            style={s.like}
          >
            <Icon name={c.liked ? 'heart-filled' : 'heart'} size={20} />
            {c.likes > 0 && (
              <T v="caption" c={color.textSecondary}>
                {c.likes}
              </T>
            )}
          </Pressable>
        </View>
        {open && replies.length > 0 && <View style={s.replies}>{replies.map(renderComment)}</View>}
      </View>
    );
  };

  return (
    <Sheet
      open={!!postId}
      onClose={onClose}
      title="Kommentarer"
      dim
      dimOpacity={0.5}
      halfHeight={560}
      halfMax={0.72}
      initialSize="half"
      footer={
        <View style={s.composer}>
          <Avatar name={me.name} path={me.avatar_path} />
          <TextInput
            ref={input}
            style={[s.field, noOutline]}
            placeholder="Tilføj en kommentar"
            placeholderTextColor={color.textSecondary}
            accessibilityLabel="Tilføj en kommentar"
            value={text}
            onChangeText={(t) => {
              setText(t);
              if (!t) setReplyTo(null);
            }}
            onSubmitEditing={send}
            returnKeyType="send"
            enterKeyHint="send"
            maxLength={1000}
          />
        </View>
      }
    >
      <View style={s.sort}>
        <CommentSort value={order} onChange={setOrder} />
      </View>
      <View style={s.comments}>
        {list.length === 0 ? (
          <T v="bodyS" c={color.textSecondary}>
            Ingen kommentarer endnu.
          </T>
        ) : (
          sortThreads(
            list.filter((c) => !c.parent_id),
            order,
          ).map(renderComment)
        )}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  sort: { paddingHorizontal: 12 },
  comments: { gap: 18, paddingVertical: 16, paddingHorizontal: 20 },
  replies: { gap: 18, paddingTop: 18, paddingLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 4 },
  actions: { flexDirection: 'row', gap: 16 },
  like: { alignItems: 'center', gap: 2, minWidth: TAP, minHeight: TAP, marginTop: -2, marginRight: -12 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: 22,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
  },
});
