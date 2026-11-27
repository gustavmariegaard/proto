import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { CommentSort, sortThreads, type CommentOrder } from '@/components/CommentSort';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MenuItem } from '@/components/MenuItem';
import { PostCard } from '@/components/PostCard';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { getPost, normalize } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { ago } from '@/lib/time';
import type { PostCard as Post } from '@/lib/types';
import { color, font, radius, TAP } from '@/theme/tokens';

type CommentRow = {
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

/** Ét opslag med kommentarer. Svar står under den kommentar, de svarer på. */
export default function PostScreen() {
  const { id, kommentarer } = useLocalSearchParams<{ id: string; kommentarer?: string }>();
  const me = useMe();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [order, setOrder] = useState<CommentOrder>('relevante');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [menuFor, setMenuFor] = useState<CommentRow | null>(null);
  const [sending, setSending] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const loadComments = useCallback(async () => {
    const { data } = await supabase.from('comment_cards').select('*').eq('post_id', id);
    setComments(((data ?? []) as CommentRow[]).map((c) => ({ ...c, likes: Number(c.likes), replies: Number(c.replies) })));
  }, [id]);

  useEffect(() => {
    getPost(id).then((p) => setPost(p ? normalize(p) : null));
    loadComments();
  }, [id, loadComments]);

  useEffect(() => {
    if (kommentarer && post) setTimeout(() => input.current?.focus(), 300);
  }, [kommentarer, post]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    // Kun én tråd-dybde: svar på et svar hænger under den øverste kommentar
    const parent = replyTo ? (replyTo.parent_id ?? replyTo.id) : null;
    const { error } = await supabase.from('comments').insert({ post_id: id, author_id: me.id, parent_id: parent, text: t });
    setSending(false);
    if (error) return;
    setText('');
    setReplyTo(null);
    loadComments();
    setPost((p) => (p ? { ...p, comments: p.comments + 1 } : p));
  };

  const toggleLike = async (c: CommentRow) => {
    setComments((l) => l.map((x) => (x.id === c.id ? { ...x, liked: !c.liked, likes: x.likes + (c.liked ? -1 : 1) } : x)));
    if (c.liked) await supabase.from('comment_likes').delete().eq('comment_id', c.id).eq('user_id', me.id);
    else await supabase.from('comment_likes').insert({ comment_id: c.id, user_id: me.id });
  };

  const remove = async (c: CommentRow) => {
    setMenuFor(null);
    await supabase.from('comments').delete().eq('id', c.id);
    loadComments();
    setPost((p) => (p ? { ...p, comments: Math.max(0, p.comments - 1 - c.replies) } : p));
  };

  if (post === undefined) {
    return (
      <Screen title="Opslag">
        <ActivityIndicator color={color.textPrimary} />
      </Screen>
    );
  }
  if (post === null) {
    return (
      <Screen title="Opslag">
        <T v="body" c={color.textSecondary}>
          Opslaget findes ikke længere.
        </T>
      </Screen>
    );
  }

  const top = sortThreads(comments.filter((c) => !c.parent_id), order);
  const repliesOf = (pid: string) =>
    comments.filter((c) => c.parent_id === pid).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const row = (c: CommentRow, reply = false) => {
    const own = c.author_id === me.id;
    return (
      <Pressable
        key={c.id}
        onLongPress={() => own && setMenuFor(c)}
        style={[s.comment, reply && s.reply]}
        accessibilityLabel={`Kommentar fra ${c.author_name}`}
      >
        <Pressable onPress={() => router.push(own ? '/profil' : `/bruger/${c.author_username}`)} accessibilityRole="link" accessibilityLabel={`Gå til ${c.author_name}`}>
          <Avatar name={c.author_name} path={c.author_avatar_path} size={reply ? 24 : 'M'} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="headingS">{c.author_name}</T>
          <T v="caption" c={color.textSecondary}>
            @{c.author_username} · {ago(c.created_at)}
          </T>
          <T v="bodyS" style={{ marginTop: 2 }}>
            {c.text}
          </T>
          <View style={s.commentActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setReplyTo(c);
                setText(`@${c.author_name.split(' ')[0]} `);
                input.current?.focus();
              }}
              style={s.small}
            >
              <T v="captionStrong" c={color.textSecondary}>
                Svar
              </T>
            </Pressable>
            {own && (
              <Pressable accessibilityRole="button" onPress={() => setMenuFor(c)} style={s.small}>
                <T v="captionStrong" c={color.textSecondary}>
                  Slet
                </T>
              </Pressable>
            )}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Synes godt om${c.likes ? `, ${c.likes}` : ''}`}
          accessibilityState={{ selected: c.liked }}
          onPress={() => toggleLike(c)}
          style={s.like}
        >
          <Icon name={c.liked ? 'heart-filled' : 'heart'} size={20} color={c.liked ? color.textPrimary : color.textSecondary} />
          {c.likes > 0 && (
            <T v="caption" c={color.textSecondary}>
              {c.likes}
            </T>
          )}
        </Pressable>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        title="Opslag"
        footer={
          <View style={s.composerWrap}>
            {replyTo && (
              <View style={s.replying}>
                <T v="caption" c={color.textSecondary} style={{ flex: 1 }}>
                  Svarer {replyTo.author_name}
                </T>
                <IconButton
                  icon="close"
                  size={16}
                  label="Annuller svar"
                  onPress={() => {
                    setReplyTo(null);
                    setText('');
                  }}
                />
              </View>
            )}
            <View style={s.composer}>
              <Avatar name={me.name} path={me.avatar_path} />
              <TextInput
                ref={input}
                style={s.field}
                placeholder="Tilføj en kommentar"
                placeholderTextColor={color.textSecondary}
                accessibilityLabel="Tilføj en kommentar"
                value={text}
                onChangeText={setText}
                onSubmitEditing={send}
                returnKeyType="send"
                maxLength={1000}
              />
              {text.trim().length > 0 && <IconButton icon="send" label="Send kommentar" onPress={send} />}
            </View>
          </View>
        }
      >
        <PostCard post={post} onComments={() => input.current?.focus()} onRemoved={() => router.back()} />

        <View style={{ gap: 4 }}>
          <View style={s.commentsHead}>
            <T v="headingM">Kommentarer</T>
            {comments.length > 1 && <CommentSort value={order} onChange={setOrder} />}
          </View>
          {comments.length === 0 ? (
            <T v="bodyS" c={color.textSecondary}>
              Ingen kommentarer endnu.
            </T>
          ) : (
            <View style={{ gap: 16 }}>
              {top.map((c) => (
                <View key={c.id} style={{ gap: 12 }}>
                  {row(c)}
                  {repliesOf(c.id).map((r) => row(r, true))}
                </View>
              ))}
            </View>
          )}
        </View>
      </Screen>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title="Kommentar">
        <MenuItem icon="close" label="Slet kommentar" danger onPress={() => menuFor && remove(menuFor)} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  commentsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  reply: { marginLeft: 52 },
  commentActions: { flexDirection: 'row', gap: 4, marginLeft: -4 },
  small: { minHeight: 36, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  like: { minWidth: TAP, minHeight: TAP, alignItems: 'center', justifyContent: 'center' },
  composerWrap: { borderTopWidth: 1, borderTopColor: color.borderDefault, backgroundColor: color.bgSurface },
  replying: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, height: 36 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  field: {
    flex: 1,
    minHeight: TAP,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
    color: color.textPrimary,
    fontFamily: font.body,
    fontSize: 16,
  },
});
