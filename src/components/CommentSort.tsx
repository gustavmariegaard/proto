import { useState } from 'react';
import { Icon } from './Icon';
import './CommentSort.css';

/** Sortering af kommentarer (inspireret af Reddit, Instagram og YouTube) */
export type CommentOrder = 'relevante' | 'nyeste' | 'omdiskuterede' | 'aeldste';

const options: { id: CommentOrder; label: string }[] = [
  { id: 'relevante', label: 'Relevante' },
  { id: 'omdiskuterede', label: 'Omdiskuterede' },
  { id: 'nyeste', label: 'Nyeste' },
  { id: 'aeldste', label: 'Ældste' },
];

/** Én lille knap øverst i kommentarerne, der åbner en kort liste */
export function CommentSort({ value, onChange }: { value: CommentOrder; onChange: (v: CommentOrder) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value)!;
  return (
    <div className="comment-sort">
      <button
        type="button"
        className="t-caption-strong comment-sort__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sorter kommentarer: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        <span className={['comment-sort__chev', open && 'comment-sort__chev--up'].filter(Boolean).join(' ')}>
          <Icon name="chevron-right" size={16} />
        </span>
      </button>
      {open && (
        <>
          <button type="button" className="comment-sort__scrim" aria-label="Luk" tabIndex={-1} onClick={() => setOpen(false)} />
          <ul className="comment-sort__menu" role="listbox" aria-label="Sorter kommentarer">
            {options.map((o) => (
              <li key={o.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  className="t-body-s comment-sort__opt"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  {o.label}
                  {o.id === value && <Icon name="check" size={18} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** "2 t.", "45 min.", "Lige nu", "i går" → minutter siden */
export function ageMinutes(time: string) {
  const t = time.toLowerCase();
  if (t.includes('nu')) return 0;
  if (t.includes('i går')) return 24 * 60;
  const n = parseFloat(t) || 0;
  if (t.includes('min')) return n;
  if (/\bt\b|\bt\.|time/.test(t)) return n * 60;
  if (/\bd\b|\bd\.|dag/.test(t)) return n * 24 * 60;
  return n;
}

type Sortable = { likes: number; time: string; replies: number; index: number };

/** Sorterer tråde. index = rækkefølgen, de blev skrevet i (højere = nyere). */
export function sortThreads<T>(items: T[], key: (t: T) => Sortable, order: CommentOrder): T[] {
  const age = (t: T) => ageMinutes(key(t).time) * 1000 - key(t).index;
  // Mest relevante: hjerter og svar, men nyere kommentarer vejer tungere
  const hot = (t: T) => (key(t).likes + key(t).replies * 2 + 1) / Math.pow(ageMinutes(key(t).time) / 60 + 2, 1.2);
  const by: Record<CommentOrder, (a: T, b: T) => number> = {
    relevante: (a, b) => hot(b) - hot(a),
    nyeste: (a, b) => age(a) - age(b),
    aeldste: (a, b) => age(b) - age(a),
    omdiskuterede: (a, b) => key(b).replies - key(a).replies || key(b).likes - key(a).likes,
  };
  return [...items].sort(by[order]);
}
