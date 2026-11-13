import { useRef, useState } from 'react';
import { useScrollFade } from '../../components/useScrollFade';
import { handleOf } from '../../data/handles';
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
import '../discover/Discover.css';
import './account.css';

type Kind = 'alle' | 'brugere' | 'opslag' | 'grupper' | 'sider';

const kinds: { value: Kind; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'brugere', label: 'Brugere' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'grupper', label: 'Grupper' },
  { value: 'sider', label: 'Sider' },
];

// Huskes, mens appen er åben, så "Seneste søgninger" overlever et besøg på en anden side.
let recentStore = initialRecentSearches;

function has(text: string, query: string) {
  return text.toLocaleLowerCase('da').includes(query.toLocaleLowerCase('da'));
}

/** Søg: brugere, opslag, grupper og sider. Åbnes fra søgeikonet i topbaren. */
export function Search() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('alle');
  const rowRef = useRef<HTMLDivElement>(null);
  useScrollFade(rowRef);
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

  const counts = { brugere: people.length, opslag: posts.length, grupper: groups.length, sider: pages.length };
  const count = kind === 'alle' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[kind];

  const personRows = (list: typeof people) =>
    list.map((p) => (
      <li key={p.id}>
        <Link to={`/bruger/${handleOf(p.name)}`} className="acc-card" onClick={remember}>
          <Avatar name={p.name} tone={p.tone} size="L" src={p.avatarSrc} />
          <span className="acc-card__text">
            <span className="t-heading-s acc-ellipsis">{p.name}</span>
            <span className="t-caption acc-muted acc-ellipsis">
              @{handleOf(p.name)} · {p.relation}
            </span>
          </span>
        </Link>
      </li>
    ));

  const postRows = (list: typeof posts) =>
    list.map((p) => (
      <li key={p.id}>
        <Link to={`/opslag/${p.id}`} className="acc-card" onClick={remember}>
          <Avatar name={p.author} tone={p.tone} size="L" src={p.avatarSrc} />
          <span className="acc-card__text">
            <span className="t-heading-s acc-ellipsis">{p.author}</span>
            <span className="t-caption acc-muted search-post__text">{p.text}</span>
          </span>
          {typeof p.image === 'string' ? (
            <img className="search-post__thumb" src={p.image} alt="" />
          ) : (
            p.image && <span className="search-post__thumb" aria-hidden="true" />
          )}
        </Link>
      </li>
    ));

  const placeRows = (list: SearchPlace[]) =>
    list.map((g) => (
      <li key={g.id}>
        <Link to={g.to} className="acc-card" onClick={remember}>
          <Avatar name={g.name} tone={g.tone} size="L" src={g.avatarSrc} />
          <span className="acc-card__text">
            <span className="t-heading-s acc-ellipsis">{g.name}</span>
            <span className="t-caption acc-muted acc-ellipsis">{g.meta}</span>
          </span>
        </Link>
      </li>
    ));

  /* "Alle": de bedste resultater fra hver type, med "Se alle" til den fulde liste */
  const sections: { kind: Exclude<Kind, 'alle'>; label: string; rows: React.ReactNode[]; total: number }[] = [
    { kind: 'brugere', label: 'Brugere', rows: personRows(people.slice(0, 3)), total: people.length },
    { kind: 'opslag', label: 'Opslag', rows: postRows(posts.slice(0, 3)), total: posts.length },
    { kind: 'grupper', label: 'Grupper', rows: placeRows(groups.slice(0, 2)), total: groups.length },
    { kind: 'sider', label: 'Sider', rows: placeRows(pages.slice(0, 2)), total: pages.length },
  ];

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
            label="Søg efter brugere, opslag, grupper og sider"
            type="search"
            enterKeyHint="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </header>

      <main className="acc-content">
        {/* Samme opbygning som filteret i Offentlig debat: én række, der kan swipes */}
        <div ref={rowRef} className="search-filter discover__row" role="radiogroup" aria-label="Søg efter">
          {kinds.map((k) => (
            <Chip
              key={k.value}
              role="radio"
              aria-pressed={undefined}
              aria-checked={k.value === kind}
              selected={k.value === kind}
              onClick={() => setKind(k.value)}
            >
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

        <span className="visually-hidden" aria-live="polite">{q ? `${count} resultater` : ''}</span>

        {count === 0 ? (
          <p className="t-body-s acc-muted acc-center">Ingen resultater for "{q}"</p>
        ) : kind === 'alle' ? (
          sections
            .filter((sec) => sec.total > 0)
            .map((sec) => (
              <section key={sec.kind} className="search-section" aria-labelledby={`search-${sec.kind}`}>
                <div className="acc-row-between">
                  <h2 id={`search-${sec.kind}`} className="t-heading-s">
                    {sec.label}
                  </h2>
                  {sec.total > sec.rows.length && (
                    <Button variant="ghost" onClick={() => setKind(sec.kind)}>
                      Se alle {sec.total}
                    </Button>
                  )}
                </div>
                <ul className="acc-list">{sec.rows}</ul>
              </section>
            ))
        ) : (
          <>
            <h2 className="t-heading-s">{kinds.find((k) => k.value === kind)!.label}</h2>
            <ul className="acc-list">
              {kind === 'brugere' && personRows(people)}
              {kind === 'opslag' && postRows(posts)}
              {kind === 'grupper' && placeRows(groups)}
              {kind === 'sider' && placeRows(pages)}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
