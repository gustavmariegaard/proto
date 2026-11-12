import { useState } from 'react';
import { Avatar, type AvatarTone } from './Avatar';
import { IconButton } from './IconButton';
import './PostCard.css';

export type Post = {
  id: string;
  author: string;
  tone?: AvatarTone;
  avatarSrc?: string;
  /** Fx "Til Venner · for 2 timer siden" */
  meta: string;
  text: string;
  /** true = grå pladsholder, eller en sti til et billede i public/img */
  image?: boolean | string;
  imageAlt?: string;
};

type PostCardProps = {
  post: Post;
  onComment?: () => void;
};

/** Opslag i feedet. Handlinger: kan lide, kommentér, del, rapportér og gem. */
export function PostCard({ post, onComment }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="post" aria-label={`Opslag fra ${post.author}`}>
      <header className="post__header">
        <Avatar name={post.author} tone={post.tone} src={post.avatarSrc} />
        <div className="post__meta">
          <h3 className="t-heading-s">{post.author}</h3>
          <p className="t-caption post__sub">{post.meta}</p>
        </div>
      </header>

      {post.image &&
        (typeof post.image === 'string' ? (
          <img className="post__image" src={post.image} alt={post.imageAlt ?? ''} />
        ) : (
          <div className="post__image" role="img" aria-label={post.imageAlt ?? 'Billede'} />
        ))}

      <p className="t-body">{post.text}</p>

      <footer className="post__actions">
        <IconButton
          icon={liked ? 'heart-filled' : 'heart'}
          label="Synes godt om"
          aria-pressed={liked}
          className={liked ? 'post__liked' : undefined}
          onClick={() => setLiked((v) => !v)}
        />
        <IconButton icon="chat" label="Kommentér" onClick={onComment} />
        <IconButton icon="send" label="Del" />
        <IconButton icon="flag" label="Rapportér" />
        <span className="post__spacer" />
        <IconButton
          icon="bookmark"
          label="Gem"
          aria-pressed={saved}
          className={saved ? 'post__saved' : undefined}
          onClick={() => setSaved((v) => !v)}
        />
      </footer>
    </article>
  );
}
