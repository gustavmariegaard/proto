import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { useSession } from '../../state/session';
import { useRelations } from '../../state/blocks';
import { keep } from '../../state/keep';
import { allAccounts } from '../../data/directory';
import { myDebatePosts, myFlicks, myProfilePosts, photoById } from '../../data/profile';
import type { FeedPost } from '../../data/sample';
import { usePosts } from '../../state/posts';
import { ProfileContent } from './ProfileContent';
import { useMe } from './shared';
import { useCollections } from './store';
import './Profile.css';

/** Din profil: highlights og fanerne Opslag · Debat · Flicks (huskes i adressen, ?fane=). */
export function Profile() {
  const navigate = useNavigate();
  const me = useMe();
  const { profile } = useSession();
  const bio = profile.bio?.trim() ?? '';
  const collections = useCollections();
  const all = usePosts();
  const mine = all.filter((p) => p.id.startsWith('mit-') && p.feed !== 'debat' && !p.group);
  const myDebate = all.filter((p) => p.id.startsWith('mit-') && p.feed === 'debat');
  const relations = useRelations();
  // Dine tal: opslag, dem der følger dig, og dem du følger
  const follows = keep<Record<string, boolean>>('follows', {});
  const accounts = allAccounts().filter((a) => !relations.blocked.includes(a.handle));
  const followers = accounts.filter((a) => a.followsMe && !relations.removedFollowers.includes(a.handle)).length;
  const followingCount = accounts.filter((a) => follows[a.handle] ?? a.followed).length;
  const postCount = mine.length + myProfilePosts.length + myDebate.length + myDebatePosts.length + myFlicks.length;
  // Dit eget moment, hvis du har delt et
  const myMoment = all.find((p) => p.id.startsWith('mit-') && p.meta === 'Moment');
  const fmt = (n: number) => n.toLocaleString('da-DK');
  // Dit navn og billede på dine opslag
  const asMe = (p: FeedPost): FeedPost => ({ ...p, author: me.name, avatarSrc: me.avatar, username: me.username.replace(/^@/, '') });

  return (
    <div className="profile">
      <section className="pf-identity" aria-label="Din profil">
        {/* Grøn ring, når du har delt et moment. Ellers et plus, der åbner kameraet (som "Dig" på forsiden). */}
        <button
          type="button"
          className={['pf-ring', !myMoment && 'pf-ring--none'].filter(Boolean).join(' ')}
          aria-label={myMoment ? 'Se dit moment' : 'Del et moment'}
          onClick={() => navigate(myMoment ? `/opslag/${myMoment.id}` : '/flicks/ny?som=moment')}
        >
          <span className="pf-ring__avatar">
            <img src={me.avatar} alt="" />
          </span>
          {!myMoment && (
            <span className="pf-ring__plus" aria-hidden="true">
              <Icon name="plus" size={16} />
            </span>
          )}
        </button>
        <div className="pf-identity__name">
          <h1 className="t-title-l">{me.name}</h1>
          <p className="t-caption pf-muted">
            {me.username}
            {profile.private && (
              <Link to="/indstillinger/privatliv" className="pf-private">
                <Icon name="lock" size={12} /> Privat
              </Link>
            )}
          </p>
        </div>
        <IconButton icon="settings" label="Indstillinger" onClick={() => navigate('/indstillinger')} />
      </section>

      {bio && <p className="t-body-s pf-bio">{bio}</p>}

      <div className="pf-stats">
        <div className="pf-stats__item">
          <span className="t-heading-m">{fmt(postCount)}</span>
          <span className="t-caption pf-muted">Opslag</span>
        </div>
        <div className="pf-stats__item">
          <span className="t-heading-m">{fmt(followers)}</span>
          <span className="t-caption pf-muted">Følgere</span>
        </div>
        <div className="pf-stats__item">
          <span className="t-heading-m">{fmt(followingCount)}</span>
          <span className="t-caption pf-muted">Følger</span>
        </div>
      </div>

      <Button variant="secondary" block onClick={() => navigate('/profil/rediger')}>
        Rediger profil
      </Button>

      <ProfileContent
        own
        name={me.name}
        highlights={collections.map((c) => ({
          id: c.id,
          title: c.title,
          cover: photoById(c.cover)?.src,
          href: `/profil/samling/${c.id}/vis`,
        }))}
        posts={[...mine, ...myProfilePosts].map(asMe)}
        debate={[...myDebate, ...myDebatePosts].map(asMe)}
        flicks={myFlicks.map((f, i) => ({ id: f.id, src: f.src, href: '/flicks', views: ['1,2 t.', '846', '2,4 t.', '310'][i % 4] }))}
      />
    </div>
  );
}
