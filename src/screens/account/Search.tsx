import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { TextField } from '../../components/TextField';
import {
  initialRecentSearches,
  searchGroups,
  searchPages,
  searchPeople,
  searchPosts,
  type SearchPlace,
} from '../../data/account';
import './account.css';

type Kind = 'folk' | 'opslag' | 'grupper' | 'sider';

const kinds: { value: Kind; label: string }[] = [
  { value: 'folk', label: 'Folk' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'grupper', label: 'Grupper' },
  { value: 'sider', label: 'Sider' },
];

// Huskes, mens appen er åben, så "Seneste søgninger" overlever et besøg på en anden side.
let recentStore = initialRecentSearches;

function has(text: string, query: string) {
  return text.toLocaleLowerCase('da').includes(query.toLocaleLowerCase('da'));
}

/** Søg: folk, opslag, grupper og sider. Åbnes fra søgeikonet i topbaren. */
export function Search() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('folk');
  const [recent, setRecentState] = useState(recentStore);

  const setRecent = (list: string[]) => {
    recentStore = list;
    setRecentState(list);
  };

  const q = query.trim();

  const remember = () => {
    if (!q) return;
    setRecent([q, ...recent.filter((r) => r.toLocaleLowerCase('da') !== q.toLocaleLowerCase('da'))].slice(0, 6));
  };

  const people = q ? searchPeople.filter((p) => has(p.name, q) || has(p.relation, q)) : searchPeople.filter((p) => p.suggested);
  const posts = q ? searchPosts.filter((p) => has(p.author, q) || has(p.text, q) || has(p.topic ?? '', q)) : searchPosts.slice(0, 4);
  const places = (list: SearchPlace[]) => (q ? list.filter((g) => has(g.name, q) || has(g.meta, q)) : list);
  const groups = places(searchGroups);
  const pages = places(searchPages);

  const count = { folk: people.length, opslag: posts.length, grupper: groups.length, sider: pages.length }[kind];
  const heading = kinds.find((k) => k.value === kind)!.label;

  return (
    <div className="acc-screen">
      <header className="search-header">
        <BackButton fallback="/" />
        <form
          className="search-header__field"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            remember();
            (document.activeElement as HTMLElement | null)?.blur();
          }}
        >
          <TextField
            label="Søg efter folk, opslag, grupper og sider"
            type="search"
            enterKeyHint="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </header>

      <main className="acc-content">
        <div className="acc-chips" role="group" aria-label="Søg efter">
          {kinds.map((k) => (
            <Chip key={k.value} selected={k.value === kind} onClick={() => setKind(k.value)}>
              {k.label}
            </Chip>
          ))}
        </div>

        {!q && recent.length > 0 && (
          <>
            <div className="acc-row-between">
              <h2 className="t-heading-s">Seneste søgninger</h2>
              <Button variant="ghost" onClick={() => setRecent([])}>
                Ryd
              </Button>
            </div>
            <div className="acc-chips">
              {recent.map((r) => (
                <Chip key={r} onClick={() => setQuery(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </>
        )}

        <h2 className="t-heading-s" aria-live="polite">
          {heading}
          {q && <span className="visually-hidden">, {count} resultater</span>}
        </h2>

        {count === 0 ? (
          <p className="t-body-s acc-muted acc-center">Ingen resultater for "{q}"</p>
        ) : (
          <ul className="acc-list">
            {kind === 'folk' &&
              people.map((p) => (
                <li key={p.id}>
                  <Link to={p.to} className="acc-card" onClick={remember}>
                    <Avatar name={p.name} tone={p.tone} size="L" src={p.avatarSrc} />
                    <span className="acc-card__text">
                      <span className="t-heading-s acc-ellipsis">{p.name}</span>
                      <span className="t-caption acc-muted acc-ellipsis">{p.relation}</span>
                    </span>
                  </Link>
                </li>
              ))}

            {kind === 'opslag' &&
              posts.map((p) => (
                <li key={p.id}>
                  <Link to={`/opslag/${p.id}`} className="acc-card" onClick={remember}>
                    <Avatar name={p.author} tone={p.tone} size="L" src={p.avatarSrc} />
                    <span className="acc-card__text">
                      <span className="t-heading-s acc-ellipsis">{p.author}</span>
                      <span className="t-caption acc-muted search-post__text">{p.text}</span>
                    </span>
                    {p.image && <img className="search-post__thumb" src={p.image} alt="" />}
                  </Link>
                </li>
              ))}

            {(kind === 'grupper' || kind === 'sider') &&
              (kind === 'grupper' ? groups : pages).map((g) => (
                <li key={g.id}>
                  <Link to={g.to} className="acc-card" onClick={remember}>
                    <Avatar name={g.name} tone={g.tone} size="L" src={g.avatarSrc} />
                    <span className="acc-card__text">
                      <span className="t-heading-s acc-ellipsis">{g.name}</span>
                      <span className="t-caption acc-muted acc-ellipsis">{g.meta}</span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </main>
    </div>
  );
}
