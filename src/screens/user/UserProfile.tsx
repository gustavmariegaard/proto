import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { isVideo } from '../../components/StoryViewer';
import { IconButton } from '../../components/IconButton';
import { PageHeader } from '../../components/PageHeader';
import { debatePostsBy, findAccount } from '../../data/directory';
import { handleOf } from '../../data/handles';
import { contacts } from '../../data/messages';
import { extrasFor } from '../../data/profileExtras';
import { publicKind, publicLabel } from '../../data/publicProfiles';
import { keep, save } from '../../state/keep';
import { usePosts } from '../../state/posts';
import { useMoments } from '../../state/moments';
import { useSession } from '../../state/session';
import { block, removeFollower, unblock, useRelations } from '../../state/blocks';
import { openConversation, openPageConversation } from '../messages/store';
import { ProfileContent } from '../profile/ProfileContent';
import '../profile/Profile.css';
import { UserMenu } from './UserMenu';
import './UserProfile.css';

/** Faste eksempeltal pr. profil */
function countsFor(handle: string, kind: 'person' | 'side') {
  let h = 7;
  for (const c of handle) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return kind === 'side'
    ? { followers: 300 + (h % 2400), following: 0 }
    : { followers: 40 + (h % 400), following: 30 + ((h >>> 8) % 300) };
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
  const relations = useRelations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const myHandle = profile.username.trim().replace(/^@/, '') || handleOf(profile.name);
  if (myHandle && handle === myHandle) return <Navigate to="/profil" replace />;
  if (!account) return <Navigate to="/" replace />;

  const following = follows[handle] ?? account.followed;
  const setFollowing = (on: boolean) => {
    const next = { ...follows, [handle]: on };
    setFollows(next);
    save('follows', next);
  };
  const toggleFollow = () => setFollowing(!following);
  const blocked = relations.blocked.includes(handle);
  // Personen følger dig, medmindre du har fjernet dem som følger
  const followsMe = account.followsMe && !relations.removedFollowers.includes(handle);
  const firstName = account.name.split(' ')[0]!;

  const feedPosts = all.filter((p) => handleOf(p.author) === handle && !p.id.startsWith('mit-'));
  const ids = new Set(feedPosts.map((p) => p.id));
  const history = [...feedPosts, ...debatePostsBy(handle).filter((p) => !ids.has(p.id))];
  const counts = countsFor(handle, account.kind);
  const debateIds = new Set(debatePostsBy(handle).map((p) => p.id));
  const author = { author: account.name, avatarSrc: account.avatarSrc, tone: account.tone, feed: 'venner' as const };
  const extraFor = extrasFor(handle);
  // Opslag til følgere: deres opslag fra feedet + korte tekster og billeder fra profilen (uden debatindlæg)
  const profilePosts = [
    ...(extraFor.pinned ? [{ ...author, id: `${handle}-pin`, meta: 'Fastgjort', text: extraFor.pinned }] : []),
    ...feedPosts.filter((p) => !debateIds.has(p.id) && p.feed !== 'debat'),
    ...extraFor.texts.map((t, i) => ({ ...author, id: `${handle}-t${i}`, meta: t.time, text: t.text, image: extraFor.photos.filter((x) => !isVideo(x))[i + 1] })),
  ];
  const extras = extrasFor(handle);
  const postCount = history.length + extras.texts.length + extras.photos.length + extras.flicks.length;


  const isSide = account.kind === 'side';
  const pk = publicKind(account.handle) ?? (isSide ? 'side' : null);
  const contact = contacts.find((c) => handleOf(c.name) === handle);
  const hasMoments = Boolean(account.momentsId) && !blocked;
  const momentsSeen = account.momentsId ? seen.includes(account.momentsId) : true;

  const message = () => {
    if (isSide) navigate(`/beskeder/${openPageConversation(account)}`);
    else if (contact) navigate(`/beskeder/${openConversation([contact.id])}`);
    else navigate('/beskeder/ny');
  };

  return (
    <div className="uprof">
      <PageHeader title={isSide ? 'Side' : 'Profil'}>
        <IconButton icon="dots" label="Mere" onClick={() => setMenuOpen(true)} />
      </PageHeader>
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
            </p>
            {account.private && (
              <span className="uprof__relation t-caption-strong">
                <Icon name="lock" size={12} /> Privat profil
              </span>
            )}
            {pk && (
              <span className={`uprof__public uprof__public--${pk} t-caption-strong`}>
                <Icon name={pk === 'person' ? 'globe' : 'building'} size={14} /> {publicLabel[pk]}
              </span>
            )}
            {followsMe && !blocked && (
              <span className={['uprof__relation t-caption-strong', following && 'uprof__relation--mutual'].filter(Boolean).join(' ')}>
                {following ? 'I følger hinanden' : 'Følger dig'}
              </span>
            )}
          </div>
        </section>

        {blocked ? (
          <div className="uprof__blocked">
            <p className="t-heading-s">Du har blokeret {firstName}</p>
            <Button variant="secondary" onClick={() => { unblock(handle); setToast(`${firstName} er ikke længere blokeret`); }}>
              Fjern blokering
            </Button>
          </div>
        ) : (
        <>
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
              <span className="t-heading-m">{fmt(counts.following - (account.followsMe && !followsMe ? 1 : 0))}</span>
              <span className="t-caption uprof__muted">Følger</span>
            </div>
          )}
        </div>

        <div className="uprof__actions">
          <Button variant={following ? 'secondary' : 'primary'} block onClick={toggleFollow} aria-pressed={following}>
            {following ? 'Følger' : account.private ? 'Anmod om at følge' : account.followsMe ? 'Følg tilbage' : 'Følg'}
          </Button>
          <Button variant="secondary" block onClick={message}>
            Besked
          </Button>
        </div>

        <ProfileContent
          locked={Boolean(account.private) && !following}
          name={firstName}
          highlights={extras.collections.map((c) => ({
            id: c.id,
            title: c.title,
            cover: c.photos.find((x) => !isVideo(x)),
            href: `/bruger/${handle}/samling/${c.id}`,
          }))}
          posts={profilePosts}
          debate={debatePostsBy(handle)}
          flicks={extras.flicks.map((src, i) => ({ id: `f${i}`, src, href: '/flicks', views: ['3,1 t.', '942', '1,5 t.'][i % 3] }))}
        />
        </>
        )}
      </main>

      {toast && (
        <p className="uprof__toast t-caption-strong" role="status">
          {toast}
        </p>
      )}

      <UserMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={firstName}
        blocked={blocked}
        followsMe={followsMe}
        onBlock={() => {
          block(handle);
          if (following) setFollowing(false);
          setToast(`${firstName} er blokeret`);
        }}
        onUnblock={() => {
          unblock(handle);
          setToast(`${firstName} er ikke længere blokeret`);
        }}
        onRemoveFollower={() => {
          removeFollower(handle);
          setToast(`${firstName} følger dig ikke længere`);
        }}
      />
    </div>
  );
}
