import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOf } from '../../data/handles';
import { TextField } from '../../components/TextField';
import { pageCount, pages as initialPages } from '../../data/more';
import { CommunityRow, MoreHeader, SortRow, matches, sortItems, type SortMode } from './parts';
import { pageStore } from './store';
import './More.css';

/** Sider: fulgte sider. Fuld skærm, rute /sider. */
export function Pages() {
  const items = pageStore.use();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('seneste');
  const shown = sortItems(items.filter((p) => matches(p.name, query)), sort);
  const total = pageCount + (items.length - initialPages.length);
  const count = query.trim() ? shown.length : total;

  return (
    <div className="more-screen">
      <MoreHeader title="Sider" action={{ label: 'Opret side', to: '/sider/ny' }} />
      <main className="more-content">
        <h2 className="t-heading-m">Fulgte sider</h2>
        <TextField label="Søg i fulgte sider" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <SortRow count={`${count} ${count === 1 ? 'side' : 'sider'}`} sort={sort} onSort={setSort} />
        {shown.length === 0 ? (
          <p className="t-body-s more-muted more-empty">Ingen sider matcher “{query.trim()}”.</p>
        ) : (
          <ul className="more-list">
            {shown.map((p) => (
              <CommunityRow key={p.id} item={p} onOpen={() => {
                  pageStore.markRead(p.id);
                  navigate(`/bruger/${handleOf(p.name)}`);
                }} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
