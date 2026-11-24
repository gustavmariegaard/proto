import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { handleOf } from '../../data/handles';
import { img } from '../../data/sample';
import { memberCount, membersOf } from './groupMembers';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { PostCard } from '../../components/PostCard';
import { groupActivity } from '../../data/more';
import { usePosts } from '../../state/posts';
import { useSession } from '../../state/session';
import { InitialsAvatar } from './parts';
import { groupStore } from './store';
import './More.css';

/** En gruppe: medlemmer, skriv i gruppen og gruppens opslag. Rute: /grupper/:id */
export function GroupView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { profile } = useSession();
  const group = groupStore.use().find((g) => g.id === id);
  const posts = usePosts();
  const [member, setMember] = useState(true);
  if (!group) return <Navigate to="/grupper" replace />;

  const groupPosts = posts.filter((p) => p.group?.name === group.name);
  const groupMembers = membersOf(group.id, groupPosts.map((p) => p.author));
  const mine = groupActivity.filter((a) => a.group === group.name);
  const members = memberCount(group.id) + (member ? 0 : -1);

  return (
    <div className="more-screen">
      <PageHeader title="Gruppe" fallback="/grupper" />
      <main className="more-content">
        <div className="group-head">
          <InitialsAvatar initials={group.initials} tone={group.tone} src={group.avatarSrc} />
          <div>
            <h1 className="t-heading-m">{group.name}</h1>
            <p className="t-caption more-muted">
              {members} medlemmer · {member ? 'Du er medlem' : 'Ikke medlem'}
            </p>
            <span className="group-badge t-caption-strong">
              <Icon name="circles" size={14} /> Gruppe
            </span>
          </div>
        </div>

        <div className="group-actions">
          <Button block onClick={() => navigate(`/opret?gruppe=${group.id}`)} disabled={!member}>
            Skriv i gruppen
          </Button>
          <Button variant="secondary" block onClick={() => setMember((m) => !m)}>
            {member ? 'Forlad gruppe' : 'Bliv medlem'}
          </Button>
        </div>

        {/* Hvem er ellers med? */}
        <section className="group-members" aria-labelledby="group-members-title">
          <div className="group-members__head">
            <h2 id="group-members-title" className="t-heading-s">
              Medlemmer
            </h2>
            <Link to={`/grupper/${group.id}/medlemmer`} className="t-caption-strong group-members__all">
              Se alle {members}
            </Link>
          </div>
          <ul className="group-members__list">
            {member && (
              <li>
                <Link to="/profil" className="group-member">
                  <Avatar name={profile.name || 'Dig'} src={profile.avatar ?? img('mig.jpg')} size="L" />
                  <span className="t-caption-strong">Dig</span>
                </Link>
              </li>
            )}
            {/* Kun én række; resten under "Se alle" */}
            {groupMembers.slice(0, 12).map((m) => (
              <li key={m.name}>
                <Link to={m.known ? `/bruger/${handleOf(m.name)}` : `/grupper/${group.id}/medlemmer`} className="group-member">
                  <Avatar name={m.name} tone={m.tone} src={m.avatarSrc} size="L" />
                  <span className="t-caption-strong">{m.name.split(' ')[0]}</span>
                  {m.admin && <span className="t-caption group-member__role">Admin</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <h2 className="t-heading-s">Opslag i gruppen</h2>
        {groupPosts.length === 0 && mine.length === 0 && (
          <p className="t-body-s more-muted">Der er ingen opslag endnu. Skriv det første.</p>
        )}
        <div className="group-posts">
          {groupPosts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onComment={() => navigate(`/opslag/${p.id}?kommentarer`)}
              onShare={() => navigate(`/opslag/${p.id}/del`)}
              onReport={() => navigate(`/opslag/${p.id}/rapporter`)}
            />
          ))}
          {mine.map((a) => (
            <article key={a.id} className="more-card">
              <p className="t-heading-s">{profile.name || 'Dig'}</p>
              <p className="t-caption more-muted">{a.when}</p>
              <p className="t-body-s">{a.text}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

