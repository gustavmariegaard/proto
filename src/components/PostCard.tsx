import { useState } from 'react';
import { Avatar, type AvatarTone } from './Avatar';
import { IconButton } from './IconButton';
import './PostCard.css';

export type Post = {
  id: string;
  author: string;
  tone?: AvatarTone;
  avatarSrc?: string;
  /** Fx "Til Venner · for 2 timer siden". Ved gruppeopslag kun tiden, fx "i går". */
  meta: string;
  /** Opslaget er delt i en gruppe (vises som på Facebook: gruppen øverst, forfatteren under) */
  group?: { name: string; initials: string; tone?: AvatarTone; avatarSrc?: string };
  text: string;
  /** true = grå pladsholder, eller en sti til et billede i public/img */
  image?: boolean | string;
  imageAlt?: string;
};

type PostCardProps = {
  post: Post;
  onComment?: () => void;
  onShare?: () => void;
  onReport?: () => void;
};

/** Opslag i feedet. Handlinger: kan lide, kommentér, del, rapportér og gem. */
export function PostCard({ post, onComment, onShare, onReport }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="post" aria-label={`Opslag fra ${post.author}`}>
      {post.group ? (
        <header className="post__header">
          <span className="post__group-pic" aria-hidden="true">
            <span className={`post__group-thumb avatar--${post.group.tone ?? 'sand'}`}>
              {post.group.avatarSrc ? <img src={post.group.avatarSrc} alt="" /> : post.group.initials}
            </span>
            <span className="post__group-author">
              <Avatar name={post.author} tone={post.tone} src={post.avatarSrc} size="S" />
            </span>
          </span>
          <div className="post__meta">
            <h3 className="t-heading-s post__group-name">{post.group.name}</h3>
            <p className="t-caption post__sub">
              {post.author} · {post.meta}
            </p>
          </div>
        </header>
      ) : (
        <header className="post__header">
          <Avatar name={post.author} tone={post.tone} src={post.avatarSrc} />
          <div className="post__meta">
            <h3 className="t-heading-s">{post.author}</h3>
            <p className="t-caption post__sub">{post.meta}</p>
          </div>
        </header>
      )}

      {post.image &&
        (typeof post.image === 'string' ? (
          // Billedet vises i sit eget format (højt, kvadratisk eller bredt), som brugeren uploadede det
          <div className="post__media">
            <img className="post__image post__image--photo" src={post.image} alt={post.imageAlt ?? ''} />
          </div>
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
        <IconButton icon="send" label="Del" onClick={onShare} />
        <IconButton icon="flag" label="Rapportér" onClick={onReport} />
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
