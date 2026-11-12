import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { savedItems, type SavedItem } from '../../data/account';
import './account.css';

type Tab = 'alt' | 'opslag' | 'flick';

const tabs: { value: Tab; label: string }[] = [
  { value: 'alt', label: 'Alt' },
  { value: 'opslag', label: 'Opslag' },
  { value: 'flick', label: 'Flicks' },
];

/** Gemt og minder: det, du har gemt, i et masonry-gitter med to kolonner. */
export function Saved() {
  const [tab, setTab] = useState<Tab>('alt');
  const shown = savedItems.filter((s) => tab === 'alt' || s.kind === tab);
  // Venstre, højre, venstre … som i Figma
  const cols: SavedItem[][] = [[], []];
  shown.forEach((s, i) => cols[i % 2]!.push(s));

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

        <div className="masonry">
          {cols.map((col, i) => (
            <div key={i} className="masonry__col">
              {col.map((s) => (
                <Link key={s.id} to={s.to} className="masonry__item" style={{ height: s.height }} aria-label={s.label}>
                  <img src={s.image} alt="" />
                </Link>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
