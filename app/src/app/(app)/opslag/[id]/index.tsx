import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { CommentsSheet } from '@/components/CommentsSheet';
import { PageHeader } from '@/components/PageHeader';
import { PostCard } from '@/components/PostCard';
import { T } from '@/components/T';
import { getPost, normalize } from '@/lib/posts';
import type { PostCard as Post } from '@/lib/types';
import { color } from '@/theme/tokens';

/** Opslag: ét opslag for sig. Kommentarerne åbner som ark ovenpå (?kommentarer). */
export default function PostDetail() {
  const { id, kommentarer } = useLocalSearchParams<{ id: string; kommentarer?: string }>();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const open = kommentarer !== undefined;

  useEffect(() => {
    getPost(id).then((p) => setPost(p ? normalize(p) : null));
  }, [id]);

  return (
    <View style={s.root}>
      <PageHeader title="Opslag" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.main}>
        {post === undefined ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={color.textPrimary} />
        ) : post === null ? (
          <T v="bodyS" c={color.textSecondary}>
            Opslaget findes ikke længere.
          </T>
        ) : (
          <PostCard
            key={version}
            post={post}
            onComments={() => router.setParams({ kommentarer: '' })}
            onRemoved={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        )}
      </ScrollView>
      {post && (
        <CommentsSheet
          postId={post.id}
          postAuthorId={post.author_id}
          open={open}
          onClose={() => router.setParams({ kommentarer: undefined })}
          onCount={(n) => {
            setPost((p) => (p ? { ...p, comments: n } : p));
            if (n !== post.comments) setVersion((v) => v + 1);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bgApp },
  main: { paddingTop: 4, paddingHorizontal: 20, paddingBottom: 32 },
});
