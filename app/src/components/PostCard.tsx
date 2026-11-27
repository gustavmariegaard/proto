import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { imageSource } from '@/lib/media';
import { deletePost, hidePost, muteInDebate, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { ago } from '@/lib/time';
import type { PostCard as Post } from '@/lib/types';
import { color, font, radius } from '@/theme/tokens';
import { ActionPill } from './ActionPill';
import { Avatar } from './Avatar';
import { CommentsSheet } from './CommentsSheet';
import { Icon } from './Icon';
import { NoteBox } from './NoteBox';
import { PostMenu } from './PostMenu';
import { PublicBadge } from './PublicBadge';
import { SharedPost } from './SharedPost';
import { StanceBar } from './StanceBar';
import { VideoView } from './VideoView';
import { T } from './T';

type Props = {
  post: Post;
  /** Kaldes, når opslaget skal forsvinde fra listen (skjult, slettet eller afsender skjult) */
  onRemoved?: (reason: 'hidden' | 'deleted' | 'muted') => void;
  /** Kommentar-knappen. Uden: kommentarerne åbner som ark (som i prototypen). */
  onComments?: () => void;
};

/** Opslag i feedet (prototypens PostCard). Debat: enig/uenig og fællesskabsnote. Ellers hjerter. */
export function PostCard({ post, onRemoved, onComments }: Props) {
  const me = useMe();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [saved, setSavedState] = useState(post.saved);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [ratio, setRatio] = useState(1);
  const debate = post.kind === 'debat';
  const mine = post.author_id === me.id;
  const first = post.author_name.split(' ')[0];
  const ctx = post.group_id ? `/grupper/${post.group_id}` : post.event_id ? `/begivenheder/${post.event_id}` : null;

  const toggleLike = () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    setLike(post.id, me.id, !liked);
  };

  const open = () => router.push(`/opslag/${post.id}`);
  const openMedia = () => router.push(`/medie/${post.id}`);
  const profile = () => router.push(mine ? '/profil' : `/bruger/${post.author_username}`);

  const why = mine
    ? 'Det er dit eget opslag.'
    : post.group_name
      ? `Du er medlem af gruppen ${post.group_name}.`
      : post.page_name
        ? `Du følger siden ${post.page_name}.`
        : debate
          ? `Opslaget handler om ${post.tags[0] ?? 'et emne'}, som er en af dine interesser.`
          : `Du følger ${post.author_name}.`;

  const moreButton = (
    <Pressable accessibilityRole="button" accessibilityLabel="Flere muligheder" onPress={() => setMenu(true)} style={s.more}>
      <Icon name="dots" />
    </Pressable>
  );

  return (
    <View style={s.post} accessibilityLabel={`Opslag fra ${post.author_name}`}>
      {ctx ? (
        // Opslag i en gruppe eller begivenhed (som på Facebook): gruppen øverst, forfatteren under
        <View style={s.header}>
          <Pressable accessibilityRole="link" accessibilityLabel={`Gå til ${post.group_name ?? post.event_title}`} onPress={() => router.push(ctx as never)} style={s.groupPic}>
            <View style={s.groupThumb}>
              {post.group_id && post.group_avatar_path ? (
                <Image source={imageSource(post.group_avatar_path)} style={s.fill} contentFit="cover" />
              ) : post.group_id ? (
                <T style={s.groupInitials} c={color.avatarSandFg}>
                  {(post.group_name ?? '?')
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join('')}
                </T>
              ) : (
                <Icon name="calendar" size={20} />
              )}
            </View>
            <View style={s.groupAuthor}>
              <Avatar name={post.author_name} path={post.author_avatar_path} size={24} />
            </View>
          </Pressable>
          <View style={s.meta}>
            <View style={s.name}>
              <Pressable onPress={() => router.push(ctx as never)} style={{ flexShrink: 1 }}>
                <T v="headingS" numberOfLines={1}>
                  {post.group_name ?? post.event_title}
                </T>
              </Pressable>
              <PublicBadge kind={post.group_id ? 'gruppe' : 'begivenhed'} />
            </View>
            <T v="caption" c={color.textSecondary} numberOfLines={1}>
              <T v="caption" style={s.nameLink} onPress={profile}>
                {post.author_name}
              </T>{' '}
              · {ago(post.created_at)}
            </T>
          </View>
          {moreButton}
        </View>
      ) : (
        <View style={s.header}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Gå til profilen for ${post.page_name ?? post.author_name}`}
            onPress={post.page_id ? () => router.push(`/sider/${post.page_handle}`) : profile}
            style={s.who}
          >
            <Avatar name={post.page_name ?? post.author_name} path={post.page_id ? post.page_avatar_path : post.author_avatar_path} />
            <View style={s.meta}>
              <View style={s.name}>
                <T v="headingS" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {post.page_name ?? post.author_name}
                </T>
                {(post.page_id || post.author_public_kind) && <PublicBadge kind={post.page_id ? 'side' : post.author_public_kind!} />}
              </View>
              <T v="caption" c={color.textSecondary} numberOfLines={1}>
                @{post.page_handle ?? post.author_username} · {debate && post.tags[0] ? post.tags[0] : ago(post.created_at)}
              </T>
            </View>
          </Pressable>
          {moreButton}
        </View>
      )}

      {/* Tryk på billede/video: fuld skærm. Tryk på resten af kortet: opslaget. */}
      {post.image_paths[0] && post.media_type === 'video' && (
        <View style={s.video}>
          <VideoView path={post.image_paths[0]} active contentFit="cover" onPress={openMedia} />
        </View>
      )}

      {post.image_paths[0] && post.media_type !== 'video' && (
        // Billedet vises i sit eget format: højst 4:5 (højt) og højst 1,91:1 (bredt)
        <Pressable accessibilityRole="button" onPress={openMedia} accessibilityLabel="Vis billedet i fuld skærm">
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
        <View style={s.tags} accessibilityLabel="Tags">
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
        {/* Hjerter overalt. Kun Offentlig debat har enig/uenig (ovenfor). */}
        {!debate && <ActionPill icon={liked ? 'heart-filled' : 'heart'} label="Synes godt om" count={likes} on={liked} tint={liked ? color.ink700 : undefined} onPress={toggleLike} />}
        <ActionPill icon="chat" label="Kommentarer" count={comments} onPress={onComments ?? (() => setSheet(true))} />
        {post.allow_share && <ActionPill icon="send" label="Del" onPress={() => router.push(`/opslag/${post.id}/del`)} />}
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

      {/* Under stemmer og knapper, så noten står for sig selv */}
      {debate && <NoteBox postId={post.id} />}

      <PostMenu
        open={menu}
        onClose={() => setMenu(false)}
        why={why}
        mine={mine}
        onHide={() => {
          hidePost(post.id, me.id);
          onRemoved?.('hidden');
        }}
        onReport={() => router.push(`/opslag/${post.id}/rapporter`)}
        onNotes={debate ? () => router.push(`/opslag/${post.id}/noter`) : undefined}
        onMute={
          debate
            ? () => {
                muteInDebate(me.id, post.author_id);
                onRemoved?.('muted');
              }
            : undefined
        }
        muteName={first}
        onDelete={async () => {
          await deletePost(post.id);
          onRemoved?.('deleted');
        }}
      />
      {!onComments && <CommentsSheet postId={post.id} postAuthorId={post.author_id} open={sheet} onClose={() => setSheet(false)} onCount={setComments} />}
    </View>
  );
}

const s = StyleSheet.create({
  post: {
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.borderDefault,
    backgroundColor: color.bgSurface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.sm },
  meta: { flex: 1, minWidth: 0, gap: 2 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameLink: { fontFamily: font.bodySemi, color: color.textSecondary },
  more: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginVertical: -6, marginRight: -10, marginLeft: 'auto' },
  groupPic: { width: 44, height: 44, flexShrink: 0, borderRadius: 12 },
  groupThumb: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color.avatarSandBg },
  groupInitials: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20 },
  groupAuthor: { position: 'absolute', right: -6, bottom: -6, borderWidth: 2, borderColor: color.bgSurface, borderRadius: 14 },
  fill: { width: '100%', height: '100%' },
  image: { width: '100%', borderRadius: radius.md, backgroundColor: color.bgSubtle },
  video: { width: '100%', aspectRatio: 9 / 16, maxHeight: 520, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.bgSubtle },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
