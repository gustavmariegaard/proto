import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TextField } from '../../components/TextField';
import { groupActivity, groupCount, groups as initialGroups } from '../../data/more';
import { CommunityRow, InitialsAvatar, MoreHeader, SortRow, matches, sortItems, type SortMode } from './parts';
import { groupStore } from './store';
import './More.css';

function GroupTabs({ active }: { active: 'grupper' | 'aktivitet' }) {
  return (
    <nav className="more-tabs" aria-label="Grupper">
      <Link
        to="/grupper"
        replace
        className={['more-tab', active === 'grupper' && 'more-tab--on'].filter(Boolean).join(' ')}
        aria-current={active === 'grupper' ? 'page' : undefined}
      >
        Dine grupper
      </Link>
      <Link
        to="/grupper/aktivitet"
        replace
        className={['more-tab', active === 'aktivitet' && 'more-tab--on'].filter(Boolean).join(' ')}
        aria-current={active === 'aktivitet' ? 'page' : undefined}
      >
        Din aktivitet
      </Link>
    </nav>
  );
}

/** Grupper · Dine grupper. Fuld skærm, rute /grupper. */
export function Groups() {
  const items = groupStore.use();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('seneste');
  const shown = sortItems(items.filter((g) => matches(g.name, query)), sort);
  const total = groupCount + (items.length - initialGroups.length);
  const count = query.trim() ? shown.length : total;

  return (
    <div className="more-screen">
      <MoreHeader title="Grupper" action={{ label: 'Opret gruppe', to: '/grupper/ny' }} />
      <main className="more-content">
        <GroupTabs active="grupper" />
        <TextField label="Søg i dine grupper" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <SortRow count={`${count} ${count === 1 ? 'gruppe' : 'grupper'}`} sort={sort} onSort={setSort} />
        {shown.length === 0 ? (
          <p className="t-body-s more-muted more-empty">Ingen grupper matcher “{query.trim()}”.</p>
        ) : (
          <ul className="more-list">
            {shown.map((g) => (
              <CommunityRow key={g.id} item={g} onOpen={() => groupStore.markRead(g.id)} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/** Grupper · Din aktivitet. Fuld skærm, rute /grupper/aktivitet. */
export function GroupActivity() {
  return (
    <div className="more-screen">
      <MoreHeader title="Grupper" action={{ label: 'Opret gruppe', to: '/grupper/ny' }} />
      <main className="more-content">
        <GroupTabs active="aktivitet" />
        <p className="t-body-s more-muted">Opslag, du har lavet i dine grupper</p>
        <ul className="more-list more-list--cards">
          {groupActivity.map((a) => (
            <li key={a.id} className="more-card">
              <div className="more-card__row more-card__row--small">
                <InitialsAvatar initials={a.initials} tone={a.tone} size="S" />
                <div className="more-card__text">
                  <span className="t-heading-s more-ellipsis">{a.group}</span>
                  <span className="t-caption more-muted more-ellipsis">{a.when}</span>
                </div>
              </div>
              <p className="t-body-s">{a.text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
