import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { PostCard } from '../../components/PostCard';
import { groupActivity } from '../../data/more';
import { usePosts } from '../../state/posts';
import { useSession } from '../../state/session';
import { InitialsAvatar } from './parts';
import { groupStore } from './store';
import './More.css';

/** Faste eksempeltal pr. gruppe */
function membersFor(id: string) {
  let h = 3;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 12 + (h % 180);
}

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
  const mine = groupActivity.filter((a) => a.group === group.name);
  const members = membersFor(group.id) + (member ? 0 : -1);

  return (
    <div className="more-screen">
      <PageHeader title="Gruppe" fallback="/grupper" />
      <main className="more-content">
        <div className="group-head">
          <InitialsAvatar initials={group.initials} tone={group.tone} src={group.avatarSrc} />
          <div>
            <h1 className="t-heading-m">{group.name}</h1>
            <p className="t-caption more-muted">
              Gruppe · {members} medlemmer · {member ? 'Du er medlem' : 'Ikke medlem'}
            </p>
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
