import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { useSession } from '../../state/session';
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
  const collections = useCollections();
  const all = usePosts();
  const mine = all.filter((p) => p.id.startsWith('mit-') && p.feed !== 'debat' && !p.group);
  const myDebate = all.filter((p) => p.id.startsWith('mit-') && p.feed === 'debat');
  // Dit navn og billede på dine opslag
  const asMe = (p: FeedPost): FeedPost => ({ ...p, author: me.name, avatarSrc: me.avatar, username: me.username.replace(/^@/, '') });

  return (
    <div className="profile">
      <section className="pf-identity" aria-label="Din profil">
        <span className="pf-ring" aria-hidden="true">
          <span className="pf-ring__avatar">
            <img src={me.avatar} alt="" />
          </span>
        </span>
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

      <p className="t-body-s">[Kort tekst om dig]</p>

      <div className="pf-stats">
        <div className="pf-stats__item">
          <span className="t-heading-m">—</span>
          <span className="t-caption pf-muted">Følgere</span>
        </div>
        <Link to="/profil/interesser" className="pf-stats__item pf-stats__item--link">
          <span className="t-heading-m">{me.interests.length}</span>
          <span className="t-caption pf-muted">Interesser</span>
        </Link>
      </div>

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
