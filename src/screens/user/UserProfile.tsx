import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Tag } from '../../components/Tag';
import { PageHeader } from '../../components/PageHeader';
import { PostCard } from '../../components/PostCard';
import { debatePostsBy, findAccount } from '../../data/directory';
import { handleOf } from '../../data/handles';
import { contacts } from '../../data/messages';
import { photoHeights } from '../../data/profile';
import { extrasFor } from '../../data/profileExtras';
import { keep, save } from '../../state/keep';
import { usePosts } from '../../state/posts';
import { useMoments } from '../../state/moments';
import { useSession } from '../../state/session';
import { openConversation } from '../messages/store';
import { Masonry, type Tile } from '../profile/shared';
import '../profile/Profile.css';
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

type Tab = 'alt' | 'tekst' | 'billeder' | 'flicks';
const tabs: { value: Tab; label: string }[] = [
  { value: 'alt', label: 'Alt' },
  { value: 'tekst', label: 'Tekst' },
  { value: 'billeder', label: 'Billeder' },
  { value: 'flicks', label: 'Flicks' },
];

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
  const [params, setParams] = useSearchParams();
  const raw = params.get('fane');
  const tab: Tab = tabs.some((t) => t.value === raw) ? (raw as Tab) : 'alt';
  const samling = params.get('samling');
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
  const extras = extrasFor(handle);
  const textPosts = history.filter((p) => typeof p.image !== 'string');
  const photos = [
    ...new Set([...history.map((p) => p.image).filter((x): x is string => typeof x === 'string'), ...extras.photos]),
  ];
  const collection = extras.collections.find((c) => c.id === samling);
  const shownPhotos = collection ? collection.photos : photos;
  const nothing = history.length + extras.texts.length + photos.length === 0 && !extras.pinned;
  const postCount = history.length + extras.texts.length + extras.photos.length + extras.flicks.length;

  const photoTile = (src: string, i: number): Tile => ({
    key: `${src}-${i}`,
    height: photoHeights[i % photoHeights.length]!,
    render: () => (
      <span className="pf-photo">
        <img src={src} alt="" />
      </span>
    ),
  });

  const card = (p: (typeof history)[number]) => {
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
  };
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
            <span className="t-heading-m">{fmt(postCount)}</span>
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

        {extras.collections.length > 0 && (
          <>
            <h2 className="t-heading-s">Samlinger</h2>
            <ul className="pf-collections">
              {extras.collections.map((c) => (
                <li key={c.id} className="pf-collection">
                  <Link
                    to={`?fane=billeder&samling=${c.id}`}
                    replace
                    className="pf-collection__link"
                    aria-current={samling === c.id ? 'true' : undefined}
                  >
                    <span className="pf-collection__photo">
                      <img src={c.photos[0]} alt="" />
                    </span>
                    <span className="t-label">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="pf-tabs" role="tablist" aria-label={`Vis på profilen for ${account.name}`}>
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className="pf-tab"
              onClick={() => setParams(t.value === 'alt' ? {} : { fane: t.value }, { replace: true })}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="pf-panel">
          {tab === 'alt' && (
            <>
              {extras.pinned && (
                <article className="pf-post">
                  <Tag>Fastgjort</Tag>
                  <p className="t-body">{extras.pinned}</p>
                </article>
              )}
              {history.map(card)}
              {extras.texts.map((t) => (
                <TextCard key={t.id} text={t.text} time={t.time} />
              ))}
              {photos.length > 0 && <Masonry tiles={photos.slice(0, 4).map(photoTile)} label="Seneste billeder" />}
              {nothing && <p className="t-body-s uprof__muted">{account.name} har ikke delt noget endnu.</p>}
            </>
          )}

          {tab === 'tekst' &&
            (textPosts.length + extras.texts.length === 0 ? (
              <p className="t-body-s uprof__muted">Ingen tekstopslag endnu.</p>
            ) : (
              <>
                {textPosts.map(card)}
                {extras.texts.map((t) => (
                  <TextCard key={t.id} text={t.text} time={t.time} />
                ))}
              </>
            ))}

          {tab === 'billeder' && (
            <>
              {collection && (
                <div className="uprof__filter">
                  <h2 className="t-heading-s">{collection.title}</h2>
                  <Chip onClick={() => setParams({ fane: 'billeder' }, { replace: true })}>Vis alle billeder</Chip>
                </div>
              )}
              {shownPhotos.length ? (
                <Masonry tiles={shownPhotos.map(photoTile)} label={collection ? collection.title : 'Billeder'} />
              ) : (
                <p className="t-body-s uprof__muted">Ingen billeder endnu.</p>
              )}
            </>
          )}

          {tab === 'flicks' &&
            (extras.flicks.length ? (
              <Masonry
                label="Flicks"
                tiles={extras.flicks.map((src, i) => ({
                  key: `f${i}`,
                  height: [230, 180, 200][i % 3]!,
                  render: () => (
                    <Link to="/flicks" className="pf-photo pf-flick" aria-label={`Flick ${i + 1} fra ${account.name}`}>
                      <img src={src} alt="" />
                      <Icon name="clip" className="pf-flick__icon" />
                    </Link>
                  ),
                }))}
              />
            ) : (
              <p className="t-body-s uprof__muted">Ingen flicks endnu.</p>
            ))}
        </div>
      </main>
    </div>
  );
}

function TextCard({ text, time }: { text: string; time: string }) {
  return (
    <article className="pf-post">
      <p className="t-body">{text}</p>
      <p className="t-caption pf-muted">{time}</p>
    </article>
  );
}
