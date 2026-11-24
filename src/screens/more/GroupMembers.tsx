import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { handleOf } from '../../data/handles';
import { usePosts } from '../../state/posts';
import { MoreHeader, matches } from './parts';
import { membersOf } from './groupMembers';
import { groupStore } from './store';
import './More.css';

/** Alle medlemmer i en gruppe, med søgning. Rute: /grupper/:id/medlemmer */
export function GroupMembers() {
  const { id = '' } = useParams();
  const group = groupStore.use().find((g) => g.id === id);
  const posts = usePosts();
  const [query, setQuery] = useState('');
  if (!group) return <Navigate to="/grupper" replace />;

  const all = membersOf(group.id, posts.filter((p) => p.group?.name === group.name).map((p) => p.author));
  const shown = all.filter((m) => matches(m.name, query));

  return (
    <div className="more-screen">
      <MoreHeader title="Medlemmer" fallback={`/grupper/${group.id}`} />
      <main className="more-content">
        <h2 className="t-heading-m">{group.name}</h2>
        <TextField label="Søg blandt medlemmerne" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <p className="t-caption more-muted" aria-live="polite">
          {query.trim() ? `${shown.length} af ${all.length} medlemmer` : `${all.length} medlemmer`}
        </p>
        {shown.length === 0 ? (
          <p className="t-body-s more-muted more-empty">Ingen medlemmer hedder “{query.trim()}”.</p>
        ) : (
          <ul className="more-list">
            {shown.map((m, i) => {
              const row = (
                <>
                  <Avatar name={m.name} tone={m.tone} src={m.avatarSrc} />
                  <span className="more-row__text">
                    <span className="member-name">
                      <span className="t-heading-s more-ellipsis">{m.name}</span>
                      {m.admin && <span className="member-admin t-caption-strong">Admin</span>}
                    </span>
                    <span className="t-caption more-muted more-ellipsis">@{handleOf(m.name)}</span>
                  </span>
                </>
              );
              return (
                <li key={`${m.name}-${i}`}>
                  {m.known ? (
                    <Link to={`/bruger/${handleOf(m.name)}`} className="more-row">
                      {row}
                    </Link>
                  ) : (
                    <div className="more-row">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
