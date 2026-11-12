import { useCallback } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { PostCard } from '../../components/PostCard';
import { posts } from '../../data/sample';
import { CommentsSheet } from './CommentsSheet';

/** Opslag: ét opslag for sig. Kommentarerne åbner som ark ovenpå. */
export function PostDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const post = posts.find((p) => p.id === id);
  const open = params.has('kommentarer');
  const close = useCallback(() => setParams({}, { replace: true }), [setParams]);
  if (!post) return <Navigate to="/" replace />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Opslag" />
      <main style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 32px' }}>
        <PostCard post={post} onComment={() => setParams({ kommentarer: '' }, { replace: true })} />
      </main>
      <CommentsSheet open={open} onClose={close} />
    </div>
  );
}
