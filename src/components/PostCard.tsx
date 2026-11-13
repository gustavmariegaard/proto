import { useState } from 'react';
import { Avatar, type AvatarTone } from './Avatar';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { handleOf } from '../data/handles';
import './PostCard.css';

export type Post = {
  id: string;
  author: string;
  tone?: AvatarTone;
  avatarSrc?: string;
  /** Fx "for 2 timer siden". Ved gruppeopslag kun tiden, fx "i går". */
  meta: string;
  /** Opslaget er delt i en gruppe (vises som på Facebook: gruppen øverst, forfatteren under) */
  group?: { name: string; initials: string; tone?: AvatarTone; avatarSrc?: string };
  text: string;
  /** true = grå pladsholder, eller en sti til et billede i public/img */
  image?: boolean | string;
  imageAlt?: string;
  /** Brugernavn uden @. Udelades det, laves det ud fra navnet. */
  username?: string;
  /** Antal synes godt om, kommentarer, delinger og gemt. Udelades de, laves faste eksempeltal ud fra id. */
  stats?: PostStats;
};

export type PostStats = { likes: number; comments: number; shares: number; saves: number };

/** Faste eksempeltal pr. opslag (samme tal hver gang). Egne nye opslag starter på 0. */
function sampleStats(id: string): PostStats {
  if (id.startsWith('mit-')) return { likes: 0, comments: 0, shares: 0, saves: 0 };
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pick = (max: number, min = 0) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return min + (h % (max - min + 1));
  };
  return { likes: pick(140, 4), comments: pick(32), shares: pick(14), saves: pick(20) };
}

const fmt = (n: number) => n.toLocaleString('da-DK');

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
  const [stats] = useState(() => post.stats ?? sampleStats(post.id));

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
            <p className="t-caption post__sub">
              @{post.username || handleOf(post.author)} · {post.meta}
            </p>
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
        <Action
          icon={liked ? 'heart-filled' : 'heart'}
          label="Synes godt om"
          count={stats.likes + (liked ? 1 : 0)}
          pressed={liked}
          className={liked ? 'post__liked' : undefined}
          onClick={() => setLiked((v) => !v)}
        />
        <Action icon="chat" label="Kommentarer" count={stats.comments} onClick={onComment} />
        <Action icon="send" label="Delinger" count={stats.shares} onClick={onShare} />
        <Action
          icon="bookmark"
          label="Gemt"
          count={stats.saves + (saved ? 1 : 0)}
          pressed={saved}
          className={saved ? 'post__saved' : undefined}
          onClick={() => setSaved((v) => !v)}
        />
        <span className="post__spacer" />
        <IconButton icon="flag" label="Rapportér" onClick={onReport} />
      </footer>
    </article>
  );
}

type ActionProps = {
  icon: IconName;
  label: string;
  count: number;
  pressed?: boolean;
  className?: string;
  onClick?: () => void;
};

/** Handling med antal ved siden af ikonet. Antallet skjules ved 0. */
function Action({ icon, label, count, pressed, className, onClick }: ActionProps) {
  return (
    <button
      type="button"
      className={['post__act', className].filter(Boolean).join(' ')}
      aria-label={count ? `${label}: ${fmt(count)}` : label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon name={icon} />
      {count > 0 && <span className="t-caption-strong post__count">{fmt(count)}</span>}
    </button>
  );
}
