import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { CommentsSheet } from '@/components/CommentsSheet';
import { Icon, type IconName } from '@/components/Icon';
import { MentionText } from '@/components/MentionText';
import { T } from '@/components/T';
import { VideoView } from '@/components/VideoView';
import { imageSource } from '@/lib/media';
import { getPost, normalize, setLike, setSaved } from '@/lib/posts';
import { useMe } from '@/lib/session';
import { fmtCount } from '@/lib/time';
import type { PostCard } from '@/lib/types';
import { useBlackChrome } from '@/lib/useDarkChrome';
import { TAP } from '@/theme/tokens';

/**
 * Billede eller video fra et opslag i fuld skærm (åbnes ved tryk på mediet i feedet).
 * Samme handlinger som på opslaget nederst: hjerte, kommentarer, del og gem.
 */
export default function MediaViewer() {
  useBlackChrome();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
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

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const path = post?.image_paths[0];
  const name = post ? (post.page_name ?? post.author_name) : '';

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {path && post?.media_type === 'video' ? (
        <VideoView path={path} active contentFit="contain" />
      ) : path ? (
        <Image source={imageSource(path)} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
      ) : null}

      <Pressable accessibilityRole="button" accessibilityLabel="Luk" onPress={close} style={[s.close, { top: insets.top + 8 }]}>
        <Icon name="close" color="#fff" />
      </Pressable>

      {post && (
        <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(post.page_id ? `/sider/${post.page_handle}` : post.author_id === me.id ? '/profil' : `/bruger/${post.author_username}`)}
            style={s.who}
          >
            <Avatar name={name} path={post.page_avatar_path ?? post.author_avatar_path} size={32} />
            <T v="headingS" c="#fff" style={s.shadow}>
              {name}
            </T>
          </Pressable>
          {!!post.text && (
            <MentionText v="bodyS" c="rgba(255,255,255,0.9)" linkColor="#fff" numberOfLines={3} style={s.shadow}>
              {post.text}
            </MentionText>
          )}
          <View style={s.actions}>
            {post.kind !== 'debat' && (
              <Act
                icon={liked ? 'heart-filled' : 'heart'}
                label="Synes godt om"
                count={likes}
                onPress={() => {
                  setLiked(!liked);
                  setLikes((n) => n + (liked ? -1 : 1));
                  setLike(post.id, me.id, !liked);
                }}
              />
            )}
            <Act icon="chat" label="Kommentarer" count={comments} onPress={() => setShowComments(true)} />
            <Act icon="send" label="Del" onPress={() => router.push(`/opslag/${post.id}/del`)} />
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
        </View>
      )}
      {post && (
        <CommentsSheet postId={post.id} postAuthorId={post.author_id} open={showComments} onClose={() => setShowComments(false)} onCount={setComments} />
      )}
    </View>
  );
}

function Act({ icon, label, count, filled, onPress }: { icon: IconName; label: string; count?: number; filled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={count ? `${label}: ${count}` : label} onPress={onPress} style={s.act}>
      <Icon name={icon} size={26} color="#fff" filled={filled} />
      {!!count && (
        <T v="captionStrong" c="#fff">
          {fmtCount(count)}
        </T>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', left: 12, width: TAP, height: TAP, borderRadius: TAP / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 40, gap: 8, backgroundColor: 'rgba(0,0,0,0.35)' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: TAP },
  shadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, minWidth: TAP },
});
