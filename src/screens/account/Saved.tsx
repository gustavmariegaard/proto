import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { savedItems } from '../../data/account';
import { posts } from '../../data/sample';
import './account.css';

type Tab = 'alt' | 'opslag' | 'flick';

const tabs: { value: Tab; label: string }[] = [
  { value: 'alt', label: 'Alt' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'flick', label: 'Flicks' },
];

type Tile = { id: string; kind: 'opslag' | 'flick'; label: string; to: string; image?: string; text?: string; author?: string };

/** Gemte tekst-opslag (uden billede) vises som kvadratiske tekstfliser. */
const savedTextPosts = ['p-karen', 'p-ahmed'];

const tiles: Tile[] = [
  ...savedItems.map(({ id, kind, label, to, image }) => ({ id, kind, label, to, image })),
  ...posts
    .filter((p) => savedTextPosts.includes(p.id))
    .map((p) => ({ id: `t-${p.id}`, kind: 'opslag' as const, label: `Opslag fra ${p.author}`, to: `/opslag/${p.id}`, text: p.text, author: p.author })),
];
// Flet tekstfliserne ind mellem billederne, så gitteret ikke ender med en klump tekst
tiles.splice(2, 0, tiles.splice(-2, 1)[0]!);

/** Gemt og minder: det, du har gemt, i et stramt gitter af kvadratiske felter. */
export function Saved() {
  const [tab, setTab] = useState<Tab>('alt');
  const shown = tiles.filter((s) => tab === 'alt' || s.kind === tab);

  return (
    <div className="acc-screen">
      <PageHeader title="Gemt" fallback="/" />

      <main className="acc-content">
        <div className="saved-tabs" role="tablist" aria-label="Vis gemte">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={t.value === tab}
              className={['saved-tab', t.value === tab && 'saved-tab--on'].filter(Boolean).join(' ')}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="t-caption acc-muted">Kun du kan se det, du har gemt.</p>

        <div className="saved-grid">
          {shown.map((s) =>
            s.image ? (
              <Link key={s.id} to={s.to} className="saved-tile" aria-label={s.label}>
                <img src={s.image} alt="" />
              </Link>
            ) : (
              <Link key={s.id} to={s.to} className="saved-tile saved-tile--text" aria-label={s.label}>
                <span className="saved-tile__text">{s.text}</span>
                <span className="t-caption saved-tile__author">{s.author}</span>
              </Link>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
