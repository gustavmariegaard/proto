import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import { color, font, TAP } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { CommentSort, sortThreads, type CommentOrder } from './CommentSort';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { T } from './T';

export type CommentRow = {
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

type Props = {
  postId: string;
  /** Opslagets forfatter (får mærket "Forfatter") */
  postAuthorId?: string;
  open: boolean;
  onClose: () => void;
  /** Nyt antal kommentarer efter man har skrevet eller slettet */
  onCount?: (n: number) => void;
};

/** Kommentarer som ark (prototypens CommentsSheet): halv højde fra start, kan trækkes op. */
export function CommentsSheet({ postId, postAuthorId, open, onClose, onCount }: Props) {
  const me = useMe();
  const [list, setList] = useState<CommentRow[]>([]);
  const [order, setOrder] = useState<CommentOrder>('relevante');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [sending, setSending] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('comment_cards').select('*').eq('post_id', postId);
    const rows = ((data ?? []) as CommentRow[]).map((c) => ({ ...c, likes: Number(c.likes), replies: Number(c.replies) }));
    setList(rows);
    return rows;
  }, [postId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    // Kun én tråd-dybde: svar på et svar hænger under den øverste kommentar
    const parent = replyTo ? (replyTo.parent_id ?? replyTo.id) : null;
    const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: me.id, parent_id: parent, text: t });
    setSending(false);
    if (error) return;
    setText('');
    setReplyTo(null);
    const rows = await load();
    onCount?.(rows.length);
  };

  const remove = async (c: CommentRow) => {
    await supabase.from('comments').delete().eq('id', c.id);
    const rows = await load();
    onCount?.(rows.length);
  };

  const toggleLike = async (c: CommentRow) => {
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, liked: !c.liked, likes: x.likes + (c.liked ? -1 : 1) } : x)));
    if (c.liked) await supabase.from('comment_likes').delete().eq('comment_id', c.id).eq('user_id', me.id);
    else await supabase.from('comment_likes').insert({ comment_id: c.id, user_id: me.id });
  };

  const reply = (c: CommentRow) => {
    setReplyTo(c);
    setText(`@${c.author_name.split(' ')[0]} `);
    input.current?.focus();
  };

  // Tråde: en kommentar og svarene lige under den
  const sorted = sortThreads(
    list.filter((c) => !c.parent_id),
    order,
  ).flatMap((c) => [c, ...list.filter((r) => r.parent_id === c.id).sort((a, b) => a.created_at.localeCompare(b.created_at))]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Kommentarer"
      initialSize="half"
      dim={false}
      footer={
        <View style={s.composer}>
          <Avatar name={me.name} path={me.avatar_path} />
          <TextInput
            ref={input}
            style={[s.field, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
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
        {sorted.length === 0 && (
          <T v="bodyS" c={color.textSecondary}>
            Ingen kommentarer endnu.
          </T>
        )}
        {sorted.map((c) => {
          const own = c.author_id === me.id;
          return (
            <View key={c.id} style={[s.comment, c.parent_id && s.reply]}>
              <Avatar name={c.author_name} path={c.author_avatar_path} />
              <View style={s.text}>
                <View style={s.name}>
                  <T v="headingS" numberOfLines={1} onPress={() => router.push(`/bruger/${c.author_username}`)}>
                    {c.author_name}
                  </T>
                  {c.author_id === postAuthorId && (
                    <T v="captionStrong" c={color.textSecondary}>
                      Forfatter
                    </T>
                  )}
                </View>
                <T v="caption" c={color.textSecondary}>
                  @{c.author_username} · {ago(c.created_at)}
                </T>
                <T v="bodyS">{c.text}</T>
                <View style={s.actions}>
                  <Pressable accessibilityRole="button" onPress={() => reply(c)} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}>
                    <T v="captionStrong" c={color.textSecondary}>
                      Svar
                    </T>
                  </Pressable>
                  {own && (
                    <Pressable accessibilityRole="button" onPress={() => remove(c)} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}>
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
                onPress={() => toggleLike(c)}
                style={s.like}
              >
                <Icon name={c.liked ? 'heart-filled' : 'heart'} size={20} color={c.liked ? color.ink700 : color.textPrimary} />
                {c.likes > 0 && (
                  <T v="caption" c={color.textSecondary}>
                    {c.likes}
                  </T>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  sort: { paddingHorizontal: 12 },
  comments: { gap: 18, paddingVertical: 16, paddingHorizontal: 20 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reply: { paddingLeft: 44 },
  text: { flex: 1, minWidth: 0, gap: 4 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
