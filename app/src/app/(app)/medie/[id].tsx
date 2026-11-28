import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { CommentsSheet } from '@/components/CommentsSheet';
import { Icon, type IconName } from '@/components/Icon';
import { MentionText } from '@/components/MentionText';
import { T } from '@/components/T';
import { MediaViewer } from '@/components/MediaViewer';
import { getPost, normalize, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { fmtCount } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { useBlackChrome } from '@/lib/useDarkChrome';
import { TAP } from '@/theme/tokens';

/**
 * Billede eller video fra et opslag i fuld skærm (åbnes ved tryk på mediet i feedet).
 * - Toner blødt frem på sort baggrund, billedet vises helt (ikke beskåret)
 * - Flere billeder: stryg til siden, prikker viser hvor man er
 * - Træk ned for at lukke, tryk på billedet for at skjule/vise knapperne
 * - Samme handlinger som på opslaget nederst: hjerte, kommentarer, del og gem
 */
export default function PostMedia() {
  useBlackChrome();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [post, setPost] = useState<PostCard | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSavedState] = useState(false);
  const [comments, setComments] = useState(0);
  const [showComments, setShowComments] = useState(false);
  useEffect(() => {
    getPost(id).then((p) => {
      if (!p) return;
      const n = normalize(p);
      setPost(n);
      setLiked(n.liked);
      setLikes(n.likes);
      setSavedState(n.saved);
      setComments(n.comments);
    });
  }, [id]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const paths = post?.image_paths ?? [];
  const video = post?.media_type === 'video';
  const name = post ? (post.page_name ?? post.author_name) : '';

  return (
    <View style={s.root}>
      {post && (
        <MediaViewer
          paths={paths}
          video={video}
          label="Billedet i opslaget"
          onClose={leave}
          footer={() => (
            <>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(post.page_id ? `/sider/${post.page_handle}` : `/bruger/${post.author_username}`)}
                style={s.who}
              >
                <Avatar name={name} path={post.page_id ? post.page_avatar_path : post.author_avatar_path} size={32} />
                <View style={{ flexShrink: 1 }}>
                  <T v="headingS" c="#fff" numberOfLines={1} style={s.shadow}>
                    {name}
                  </T>
                  <T v="caption" c="rgba(255,255,255,0.75)" numberOfLines={1} style={s.shadow}>
                    @{post.page_handle ?? post.author_username}
                  </T>
                </View>
              </Pressable>
              {!!post.text && (
                <MentionText v="bodyS" c="rgba(255,255,255,0.92)" linkColor="#fff" numberOfLines={3} style={s.shadow}>
                  {post.text}
                </MentionText>
              )}
              <View style={s.actions}>
                {post.kind !== 'debat' && (
                  <Act
                    icon={liked ? 'heart-filled' : 'heart'}
                    label="Synes godt om"
                    count={likes}
                    filled={liked}
                    onPress={() => {
                      setLiked(!liked);
                      setLikes((n) => n + (liked ? -1 : 1));
                      setLike(post.id, me.id, !liked);
                    }}
                  />
                )}
                <Act icon="chat" label="Kommentarer" count={comments} onPress={() => setShowComments(true)} />
                <Act icon="send" label="Del" onPress={() => router.push(`/opslag/${post.id}/del`)} />
                <View style={{ flex: 1 }} />
                <Act
                  icon="bookmark"
                  label="Gem"
                  filled={saved}
                  onPress={() => {
                    setSavedState(!saved);
                    setSaved(post.id, me.id, !saved);
                  }}
                />
              </View>
            </>
          )}
        >
          <CommentsSheet postId={post.id} postAuthorId={post.author_id} open={showComments} onClose={() => setShowComments(false)} onCount={setComments} />
        </MediaViewer>
      )}
    </View>
  );
}

function Act({ icon, label, count, filled, onPress }: { icon: IconName; label: string; count?: number; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}: ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [s.act, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Icon name={icon} size={26} color="#fff" filled={filled} />
      {!!count && (
        <T v="captionStrong" c="#fff" style={s.shadow}>
          {fmtCount(count)}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  who: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', minHeight: TAP },
  shadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 2 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, minWidth: TAP },
});
