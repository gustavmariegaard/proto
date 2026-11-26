import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, type AvatarTone } from './Avatar';
import { Icon, type IconName } from './Icon';
import { PostMenu } from './PostMenu';
import { setHidden, useHidden } from '../state/posts';
import { LikeButton } from './LikeButton';
import { StanceBar } from './StanceBar';
import { shownNote, useNotes } from '../state/notes';
import { groups } from '../data/more';
import { initialEvents } from '../data/events';
import { publicKind, publicLabel, type PublicKind } from '../data/publicProfiles';
import { handleOf } from '../data/handles';
import { discoverPosts } from '../data/discover';

/** Opslag, der hører til Offentlig debat – også når de vises andre steder */
const debateIds = new Set(discoverPosts.map((p) => p.id));
import './PostCard.css';

export type Post = {
  id: string;
  author: string;
  tone?: AvatarTone;
  avatarSrc?: string;
  /** Fx "for 2 timer siden". Ved gruppeopslag kun tiden, fx "i går". */
  meta: string;
  /** Opslaget er delt i en gruppe (vises som på Facebook: gruppen øverst, forfatteren under) */
  /** Opslaget er delt i en gruppe eller en begivenhed */
  group?: { name: string; initials: string; tone?: AvatarTone; avatarSrc?: string; kind?: 'gruppe' | 'begivenhed' };
  text: string;
  /** true = grå pladsholder, eller en sti til et billede i public/img */
  image?: boolean | string;
  imageAlt?: string;
  /** Offentlig debat: op/ned-stemmer i stedet for likes */
  score?: number;
  /** Tags (Offentlig debat), fx ['Byudvikling', 'Cykelstier'] */
  tags?: string[];
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
  /** Offentlig debat: skjul afsenderen i debatten */
  onMute?: () => void;
};

/** Opslag i feedet. Handlinger: kan lide, kommentér, del, rapportér og gem. */
export function PostCard({ post, onComment, onShare, onReport, onMute }: PostCardProps) {
  const navigate = useNavigate();
  // Offentlig debat: enig/uenig og fællesskabsnoter
  const debate = post.score !== undefined || debateIds.has(post.id);
  const note = shownNote(useNotes(), post.id);
  const [saved, setSaved] = useState(false);
  const [stats] = useState(() => post.stats ?? sampleStats(post.id));
  const kind = post.group ? null : publicKind(post.author);
  // Gruppe- og begivenhedsopslag: navnet og billedet fører til gruppen eller begivenheden
  const groupHref = post.group
    ? post.group.kind === 'begivenhed'
      ? `/begivenheder/${initialEvents.find((e) => e.title === post.group!.name)?.id ?? ''}`
      : `/grupper/${groups.find((g) => g.name === post.group!.name)?.id ?? ''}`
    : '';
  const handle = post.username || handleOf(post.author);
  // Egne opslag åbner din egen profil
  const profileHref = post.id.startsWith('mit-') ? '/profil' : `/bruger/${handle}`;
  const [menu, setMenu] = useState<'closed' | 'menu'>('closed');
  const isHidden = useHidden(post.id);
  const mine = post.id.startsWith('mit-');

  const moreButton = (
    <button type="button" className="post__more" aria-label="Flere muligheder" aria-haspopup="dialog" onClick={() => setMenu('menu')}>
      <Icon name="dots" />
    </button>
  );

  /* "Ikke interesseret": opslaget foldes sammen til en kort besked, som kan fortrydes */
  if (isHidden) {
    return (
      <article className="post post--hidden" aria-label={`Skjult opslag fra ${post.author}`}>
        <p className="t-body-s">
          <strong>Opslaget er skjult.</strong> Du ser færre opslag som dette.
        </p>
        <button type="button" className="t-caption-strong post__undo" onClick={() => setHidden(post.id, false)}>
          Fortryd
        </button>
      </article>
    );
  }

  return (
    <article className="post" aria-label={`Opslag fra ${post.author}`}>
      {post.group ? (
        <header className="post__header">
          <Link to={groupHref} className="post__group-pic" aria-label={`Gå til ${post.group.name}`}>
            <span className={`post__group-thumb avatar--${post.group.tone ?? 'sand'}`}>
              {post.group.avatarSrc ? <img src={post.group.avatarSrc} alt="" /> : post.group.initials}
            </span>
            <span className="post__group-author">
              <Avatar name={post.author} tone={post.tone} src={post.avatarSrc} size="S" />
            </span>
          </Link>
          <div className="post__meta">
            <h3 className="t-heading-s post__name">
              <Link to={groupHref} className="post__group-name post__name-link">
                {post.group.name}
              </Link>
              <PublicBadge kind={post.group.kind ?? 'gruppe'} />
            </h3>
            <p className="t-caption post__sub">
              <Link to={profileHref} className="post__name-link">{post.author}</Link> · {post.meta}
            </p>
          </div>
          {moreButton}
        </header>
      ) : (
        <header className="post__header">
          <Link to={profileHref} className="post__who" aria-label={`Gå til profilen for ${post.author}`}>
            <Avatar name={post.author} tone={post.tone} src={post.avatarSrc} />
            <div className="post__meta">
              <h3 className="t-heading-s post__name">
                {post.author}
                {kind && <PublicBadge kind={kind} />}
              </h3>
              <p className="t-caption post__sub">
                @{handle} · {post.meta}
              </p>
            </div>
          </Link>
          {moreButton}
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

      {post.tags && post.tags.length > 0 && (
        <ul className="post__tags" aria-label="Tags">
          {post.tags.map((t) => (
            <li key={t} className="t-caption-strong post__tag">
              #{t}
            </li>
          ))}
        </ul>
      )}

      {/* Som Community Notes på X: overskrift, note, kilde og "Bedøm" */}
      {note && (
        <aside className="post-note" aria-label="Fællesskabsnote">
          <p className="t-caption-strong post-note__title">
            <Icon name="circles" size={18} />
            Læsere har tilføjet kontekst
          </p>
          <p className="t-body-s">{note.text}</p>
          {note.source && <p className="t-caption post-note__source">{note.source}</p>}
          <div className="post-note__foot">
            <span className="t-caption post-note__muted">Er noten hjælpsom?</span>
            <Link to={`/opslag/${post.id}/noter`} className="t-caption-strong post-note__rate">
              Bedøm
            </Link>
          </div>
        </aside>
      )}

      {debate && <StanceBar id={post.id} />}

      <footer className="post__actions">
        {/* Hjerter overalt. Kun Offentlig debat har enig/uenig (ovenfor). */}
        {!debate && <LikeButton id={post.id} base={stats.likes} />}
        <Action icon="chat" label="Kommentarer" count={stats.comments} onClick={onComment} />
        <Action icon="send" label="Delinger" count={stats.shares} onClick={onShare} />
        <Action
          icon="bookmark"
          label="Gem"
          // Antal gemte vises ikke (det er privat)
          count={0}
          pressed={saved}
          className={saved ? 'post__saved' : undefined}
          onClick={() => setSaved((v) => !v)}
        />

      </footer>

      <PostMenu
        open={menu !== 'closed'}
        onClose={() => setMenu('closed')}
        why={whyText(post)}
        mine={mine}
        onHide={() => setHidden(post.id, true)}
        onReport={onReport}
        onNotes={debate ? () => navigate(`/opslag/${post.id}/noter`) : undefined}
        onMute={debate ? onMute : undefined}
        muteName={post.author.split(' ')[0]}
      />
    </article>
  );
}

/** Forklaringen bag "Hvorfor ser jeg dette opslag?" */
function whyText(post: Post & { feed?: string; topic?: string }) {
  const name = post.group?.name;
  if (post.id.startsWith('mit-')) return 'Det er dit eget opslag.';
  if (name) return `Du er medlem af gruppen ${name}.`;
  if (post.meta.startsWith('Side')) return `Du følger siden ${post.author}.`;
  if (post.feed === 'debat' || post.topic) return `Opslaget handler om ${post.topic ?? post.meta}, som er en af dine interesser.`;
  return `Du følger ${post.author}.`;
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


/** Lille mærke ved navnet: megafon = offentlig person, bygning = side, to personer = gruppe. */
export function PublicBadge({ kind }: { kind: PublicKind | 'gruppe' | 'begivenhed' }) {
  const label = kind === 'gruppe' ? 'Gruppe' : kind === 'begivenhed' ? 'Begivenhed' : publicLabel[kind];
  return (
    <span className={`public-badge public-badge--${kind}`} role="img" aria-label={label} title={label}>
      <Icon name={badgeIcon[kind]} size={13} />
    </span>
  );
}

/** Ét ikon pr. slags fællesskab: offentlig person, side og gruppe */
export const badgeIcon = { person: 'globe', side: 'building', gruppe: 'circles', begivenhed: 'calendar' } as const;
