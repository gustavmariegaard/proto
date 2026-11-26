import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { deletePost, hidePost, muteInDebate, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { ago } from '@/lib/time';
import type { PostCard as Post } from '@/lib/types';
import { color, radius } from '@/theme/tokens';
import { ActionPill } from './ActionPill';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { MenuItem } from './MenuItem';
import { NoteBox } from './NoteBox';
import { Sheet } from './Sheet';
import { SharedPost } from './SharedPost';
import { StanceBar } from './StanceBar';
import { VideoView } from './VideoView';
import { T } from './T';

type Props = {
  post: Post;
  /** Kaldes, når opslaget skal forsvinde fra listen (skjult, slettet eller afsender skjult) */
  onRemoved?: (reason: 'hidden' | 'deleted' | 'muted') => void;
  /** På selve opslagssiden åbner kommentar-knappen ikke en ny side */
  onComments?: () => void;
};

/** Opslag. Debat: enig/uenig og fællesskabsnote. Ellers hjerter. */
export function PostCard({ post, onRemoved, onComments }: Props) {
  const me = useMe();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [saved, setSavedState] = useState(post.saved);
  const [menu, setMenu] = useState<'closed' | 'menu' | 'why'>('closed');
  const [ratio, setRatio] = useState(1);
  const debate = post.kind === 'debat';
  const mine = post.author_id === me.id;
  const first = post.author_name.split(' ')[0];

  const toggleLike = () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    setLike(post.id, me.id, !liked);
  };

  const open = () => router.push(`/opslag/${post.id}`);
  const profile = () => router.push(mine ? '/profil' : `/bruger/${post.author_username}`);

  return (
    <View style={s.card} accessibilityLabel={`Opslag fra ${post.author_name}`}>
      <View style={s.header}>
        {post.group_id || post.event_id ? (
          // Gruppe/begivenhed øverst, forfatteren under (som i prototypen)
          <View style={s.who}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Gå til ${post.group_name ?? post.event_title}`}
              onPress={() => router.push(post.group_id ? `/grupper/${post.group_id}` : `/begivenheder/${post.event_id}`)}
              style={s.ctx}
            >
              <View style={s.ctxThumb}>
                {post.group_id ? (
                  <Avatar name={post.group_name ?? '?'} path={post.group_avatar_path} />
                ) : (
                  <View style={s.ctxIcon}>
                    <Icon name="calendar" size={20} />
                  </View>
                )}
                <View style={s.ctxAuthor}>
                  <Avatar name={post.author_name} path={post.author_avatar_path} size="S" />
                </View>
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => router.push(post.group_id ? `/grupper/${post.group_id}` : `/begivenheder/${post.event_id}`)}>
                <T v="headingS" numberOfLines={1}>
                  {post.group_name ?? post.event_title}
                </T>
              </Pressable>
              <Pressable onPress={profile}>
                <T v="caption" c={color.textSecondary} numberOfLines={1}>
                  {post.author_name} · {ago(post.created_at)}
                </T>
              </Pressable>
            </View>
          </View>
        ) : post.page_id ? (
          // Opslag fra en side: siden er afsender
          <Pressable accessibilityRole="link" accessibilityLabel={`Gå til ${post.page_name}`} onPress={() => router.push(`/sider/${post.page_handle}`)} style={s.who}>
            <Avatar name={post.page_name ?? '?'} path={post.page_avatar_path} />
            <View style={{ flex: 1 }}>
              <View style={s.nameRow}>
                <T v="headingS" numberOfLines={1}>
                  {post.page_name}
                </T>
                <Icon name="building" size={13} color={color.green700} />
              </View>
              <T v="caption" c={color.textSecondary} numberOfLines={1}>
                @{post.page_handle} · {ago(post.created_at)}
              </T>
            </View>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="link" accessibilityLabel={`Gå til ${post.author_name}`} onPress={profile} style={s.who}>
            <Avatar name={post.author_name} path={post.author_avatar_path} />
            <View style={{ flex: 1 }}>
              <View style={s.nameRow}>
                <T v="headingS" numberOfLines={1}>
                  {post.author_name}
                </T>
                {post.author_public_kind && <Icon name={post.author_public_kind === 'side' ? 'building' : 'globe'} size={13} color={color.green700} />}
              </View>
              <T v="caption" c={color.textSecondary} numberOfLines={1}>
                @{post.author_username} · {debate ? post.tags[0] : ago(post.created_at)}
              </T>
            </View>
          </Pressable>
        )}
        <IconButton icon="dots" label="Flere muligheder" onPress={() => setMenu('menu')} />
      </View>

      {post.image_paths[0] && post.media_type === 'video' && <VideoView path={post.image_paths[0]} active style={s.video} contentFit="cover" />}

      {post.image_paths[0] && post.media_type !== 'video' && (
        <Pressable onPress={open} accessibilityLabel="Åbn opslaget">
          <Image
            source={imageSource(post.image_paths[0])}
            style={[s.image, { aspectRatio: ratio }]}
            contentFit="cover"
            transition={150}
            onLoad={(e) => e.source.width && setRatio(Math.max(0.8, Math.min(1.91, e.source.width / e.source.height)))}
          />
        </Pressable>
      )}

      {!!post.text && (
        <Pressable onPress={open}>
          <T v="body">{post.text}</T>
        </Pressable>
      )}

      {post.shared_post_id && <SharedPost id={post.shared_post_id} />}

      {post.tags.length > 0 && (
        <View style={s.tags}>
          {post.tags.map((t) => (
            <View key={t} style={s.tag}>
              <T v="captionStrong" c={color.textSecondary}>
                #{t}
              </T>
            </View>
          ))}
        </View>
      )}

      {debate && <StanceBar postId={post.id} userId={me.id} initial={post.my_stance} />}

      <View style={s.actions}>
        {!debate && <ActionPill icon={liked ? 'heart-filled' : 'heart'} label="Synes godt om" count={likes} on={liked} onPress={toggleLike} />}
        <ActionPill icon="chat" label="Kommentarer" count={post.comments} onPress={onComments ?? (() => router.push(`/opslag/${post.id}?kommentarer=1`))} />
        {post.allow_share && (
          <ActionPill
            icon="send"
            label="Del"
            onPress={() => router.push(`/opslag/${post.id}/del`)}
          />
        )}
        <ActionPill
          icon="bookmark"
          label="Gem"
          on={saved}
          filled={saved}
          onPress={() => {
            setSavedState(!saved);
            setSaved(post.id, me.id, !saved);
          }}
        />
      </View>

      {/* Noten står nederst, under stemmer og knapper, så den skiller sig ud */}
      {debate && <NoteBox postId={post.id} />}

      <Sheet open={menu !== 'closed'} onClose={() => setMenu('closed')} title={menu === 'why' ? 'Hvorfor ser jeg dette opslag?' : 'Opslag'}>
        {menu === 'why' ? (
          <View style={{ padding: 20, gap: 12 }}>
            <T v="body">
              {mine
                ? 'Det er dit eget opslag.'
                : debate
                  ? `Opslaget handler om ${post.tags.join(', ')}, som er en af dine interesser.`
                  : `Du følger ${post.author_name}.`}
            </T>
            <T v="caption" c={color.textSecondary}>
              ciircle viser kun opslag fra dem, du følger, og de interesser, du selv har valgt.
            </T>
          </View>
        ) : (
          <View>
            <MenuItem icon="info" label="Hvorfor ser jeg dette opslag?" onPress={() => setMenu('why')} />
            {!mine && (
              <MenuItem
                icon="eye-off"
                label="Ikke interesseret"
                onPress={() => {
                  setMenu('closed');
                  hidePost(post.id, me.id);
                  onRemoved?.('hidden');
                }}
              />
            )}
            {debate && (
              <MenuItem
                icon="note"
                label="Fællesskabsnoter"
                onPress={() => {
                  setMenu('closed');
                  router.push(`/opslag/${post.id}/noter`);
                }}
              />
            )}
            {debate && !mine && (
              <MenuItem
                icon="mute"
                label={`Skjul ${first} i debatten`}
                onPress={() => {
                  setMenu('closed');
                  muteInDebate(me.id, post.author_id);
                  onRemoved?.('muted');
                }}
              />
            )}
            {!mine && (
              <MenuItem
                icon="flag"
                label="Rapportér"
                danger
                onPress={() => {
                  setMenu('closed');
                  router.push(`/opslag/${post.id}/rapporter`);
                }}
              />
            )}
            {mine && (
              <MenuItem
                icon="close"
                label="Slet opslag"
                danger
                onPress={async () => {
                  setMenu('closed');
                  await deletePost(post.id);
                  onRemoved?.('deleted');
                }}
              />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctx: { width: 48, height: 44 },
  ctxThumb: { width: 48, height: 44 },
  ctxIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.bgSubtle, alignItems: 'center', justifyContent: 'center' },
  ctxAuthor: { position: 'absolute', right: 0, bottom: -2, borderRadius: 14, borderWidth: 2, borderColor: color.bgSurface },
  image: { width: '100%', borderRadius: radius.md, backgroundColor: color.bgSubtle },
  video: { width: '100%', aspectRatio: 9 / 16, maxHeight: 520, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
