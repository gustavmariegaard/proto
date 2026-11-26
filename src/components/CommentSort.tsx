import { Chip } from './Chip';
import './CommentSort.css';

/** Sortering af kommentarer (egne navne, inspireret af Reddits Hot / New / Controversial / Old) */
export type CommentOrder = 'populaere' | 'nyeste' | 'debat' | 'aeldste';

const options: { id: CommentOrder; label: string }[] = [
  { id: 'populaere', label: 'Populære' },
  { id: 'nyeste', label: 'Nyeste' },
  { id: 'debat', label: 'Mest debat' },
  { id: 'aeldste', label: 'Ældste' },
];

export function CommentSort({ value, onChange }: { value: CommentOrder; onChange: (v: CommentOrder) => void }) {
  return (
    <div className="comment-sort" role="radiogroup" aria-label="Sorter kommentarer">
      {options.map((o) => (
        <Chip
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          aria-pressed={undefined}
          selected={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </Chip>
      ))}
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
  const by: Record<CommentOrder, (a: T, b: T) => number> = {
    populaere: (a, b) => key(b).likes - key(a).likes || age(a) - age(b),
    nyeste: (a, b) => age(a) - age(b),
    aeldste: (a, b) => age(b) - age(a),
    debat: (a, b) => key(b).replies - key(a).replies || key(b).likes - key(a).likes,
  };
  return [...items].sort(by[order]);
}
