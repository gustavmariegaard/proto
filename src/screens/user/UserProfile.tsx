import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { PostCard } from '../../components/PostCard';
import { debatePostsBy, findAccount } from '../../data/directory';
import { handleOf } from '../../data/handles';
import { contacts } from '../../data/messages';
import { keep, save } from '../../state/keep';
import { usePosts } from '../../state/posts';
import { useMoments } from '../../state/moments';
import { useSession } from '../../state/session';
import { openConversation } from '../messages/store';
import './UserProfile.css';

/** Faste eksempeltal pr. profil */
function countsFor(handle: string, kind: 'person' | 'side') {
  let h = 7;
  for (const c of handle) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return kind === 'side'
    ? { followers: 300 + (h % 2400), following: 0 }
    : { followers: 40 + (h % 400), following: 30 + ((h >> 8) % 300) };
}

const fmt = (n: number) => n.toLocaleString('da-DK');

/**
 * En andens profil eller en side: billede, navn, @brugernavn, følg-knap
 * og hele deres historik af opslag. Rute: /bruger/:handle
 */
export function UserProfile() {
  const { handle = '' } = useParams();
  const navigate = useNavigate();
  const { profile } = useSession();
  const { seen } = useMoments();
  const all = usePosts();
  const account = findAccount(handle);
  const [follows, setFollows] = useState<Record<string, boolean>>(() => keep('follows', {}));

  const myHandle = profile.username.trim().replace(/^@/, '') || handleOf(profile.name);
  if (myHandle && handle === myHandle) return <Navigate to="/profil" replace />;
  if (!account) return <Navigate to="/" replace />;

  const following = follows[handle] ?? account.followed;
  const toggleFollow = () => {
    const next = { ...follows, [handle]: !following };
    setFollows(next);
    save('follows', next);
  };

  const feedPosts = all.filter((p) => handleOf(p.author) === handle && !p.id.startsWith('mit-'));
  const ids = new Set(feedPosts.map((p) => p.id));
  const history = [...feedPosts, ...debatePostsBy(handle).filter((p) => !ids.has(p.id))];
  const counts = countsFor(handle, account.kind);
  const isSide = account.kind === 'side';
  const contact = contacts.find((c) => handleOf(c.name) === handle);
  const hasMoments = Boolean(account.momentsId);
  const momentsSeen = account.momentsId ? seen.includes(account.momentsId) : true;

  const message = () => {
    if (contact) navigate(`/beskeder/${openConversation([contact.id])}`);
    else navigate('/beskeder/ny');
  };

  return (
    <div className="uprof">
      <PageHeader title={isSide ? 'Side' : 'Profil'} />
      <main className="uprof__content">
        <section className="uprof__identity">
          {hasMoments ? (
            <button
              type="button"
              className={['uprof__ring', momentsSeen && 'uprof__ring--seen'].filter(Boolean).join(' ')}
              aria-label={`Se moments fra ${account.name}`}
              onClick={() => navigate(`/moment/${account.momentsId}`)}
            >
              <Avatar name={account.name} tone={account.tone} src={account.avatarSrc} size="XL" />
            </button>
          ) : (
            <span className="uprof__ring uprof__ring--none">
              <Avatar name={account.name} tone={account.tone} src={account.avatarSrc} size="XL" />
            </span>
          )}
          <div className="uprof__name">
            <h1 className="t-title-l">{account.name}</h1>
            <p className="t-caption uprof__muted">
              @{account.handle}
              {isSide && ' · Side'}
            </p>
          </div>
        </section>

        {account.bio && <p className="t-body-s">{account.bio}</p>}

        <div className="uprof__stats">
          <div>
            <span className="t-heading-m">{fmt(history.length)}</span>
            <span className="t-caption uprof__muted">Opslag</span>
          </div>
          <div>
            <span className="t-heading-m">{fmt(counts.followers + (following && !account.followed ? 1 : 0) - (!following && account.followed ? 1 : 0))}</span>
            <span className="t-caption uprof__muted">Følgere</span>
          </div>
          {!isSide && (
            <div>
              <span className="t-heading-m">{fmt(counts.following)}</span>
              <span className="t-caption uprof__muted">Følger</span>
            </div>
          )}
        </div>

        <div className="uprof__actions">
          <Button variant={following ? 'secondary' : 'primary'} block onClick={toggleFollow} aria-pressed={following}>
            {following ? 'Følger' : 'Følg'}
          </Button>
          {!isSide && (
            <Button variant="secondary" block onClick={message}>
              Besked
            </Button>
          )}
        </div>

        <h2 className="t-heading-s">Opslag</h2>
        {history.length === 0 ? (
          <p className="t-body-s uprof__muted">{account.name} har ikke delt noget endnu.</p>
        ) : (
          <div className="uprof__posts">
            {history.map((p) => {
              const linkable = all.some((x) => x.id === p.id);
              return (
                <PostCard
                  key={p.id}
                  post={p}
                  onComment={linkable ? () => navigate(`/opslag/${p.id}?kommentarer`) : undefined}
                  onShare={linkable ? () => navigate(`/opslag/${p.id}/del`) : undefined}
                  onReport={linkable ? () => navigate(`/opslag/${p.id}/rapporter`) : undefined}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
