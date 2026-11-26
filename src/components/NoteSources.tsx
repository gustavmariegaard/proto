import { useState } from 'react';
import './NoteSources.css';

const LIMIT = 3;

/** Kilder under en fællesskabsnote. Over 3 foldes resten ind bag "Vis alle kilder". */
export function NoteSources({ sources }: { sources: string[] }) {
  const [all, setAll] = useState(false);
  if (sources.length === 0) return null;
  const shown = all ? sources : sources.slice(0, LIMIT);
  return (
    <div className="note-sources">
      <ul className="note-sources__list" aria-label="Kilder">
        {shown.map((s, i) => (
          <li key={i} className="t-caption note-sources__item">
            {s}
          </li>
        ))}
      </ul>
      {sources.length > LIMIT && (
        <button type="button" className="t-caption-strong note-sources__more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? 'Vis færre kilder' : `Vis alle kilder (${sources.length})`}
        </button>
      )}
    </div>
  );
}
