import { useCallback, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { PostCard } from '../../components/PostCard';
import { Sheet } from '../../components/Sheet';
import { allTopics, discoverPosts, initialTopics, trends } from '../../data/discover';
import './Discover.css';

type AccordionProps = {
  title: string;
  /** Vises under titlen, når panelet er lukket */
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

/** Kort, der folder sig ud (Figma: Accordion filter / Accordion trend). */
function Accordion({ title, summary, open, onToggle, children }: AccordionProps) {
  const panelId = useId();
  return (
    <section className={['acc', open && 'acc--open'].filter(Boolean).join(' ')}>
      <button type="button" className="acc__header" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="acc__text">
          <span className="t-heading-m">{title}</span>
          {!open && summary && <span className="t-caption acc__summary">{summary}</span>}
        </span>
        <Icon name="chevron-right" className="acc__chevron" />
      </button>
      {open && (
        <div id={panelId} className="acc__panel">
          {children}
        </div>
      )}
    </section>
  );
}

/** Opdag: offentlig samtale med dit eget emnefilter og aktuelle emner. */
export function Discover() {
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [saved, setSaved] = useState<string[]>(initialTopics);
  const [trend, setTrend] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const closePicker = useCallback(() => setPicking(false), []);

  const toggleTopic = (t: string) => setTopics((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  // Emnerne i filteret står først, så man kan slå dem til og fra; "+ Emne" tilføjer flere.
  const shownTopics = [...new Set([...initialTopics, ...saved, ...added])];
  const shown = trend
    ? discoverPosts.filter((p) => p.trends.includes(trend))
    : topics.length
      ? discoverPosts.filter((p) => topics.includes(p.topic))
      : discoverPosts;

  const saveFilter = () => {
    setSaved(topics);
    setFilterOpen(false);
    setStatus('Filteret er gemt');
  };

  return (
    <div className="discover">
      <p className="visually-hidden" role="status" aria-live="polite">
        {status}
      </p>
      <h1 className="t-title-xl">Offentlig samtale</h1>
      <p className="t-body-s discover__intro">
        Kun verificerede personer. Find emner, og lav et filter, der viser de opslag, du vil se.
      </p>

      <Accordion
        title="Mit filter"
        summary={saved.length ? saved.join(' · ') : undefined}
        open={filterOpen}
        onToggle={() => setFilterOpen((v) => !v)}
      >
        <ul className="discover__chips" aria-label="Emner i dit filter">
          {shownTopics.map((t) => (
            <li key={t}>
              <Chip selected={topics.includes(t)} onClick={() => toggleTopic(t)}>
                {t}
              </Chip>
            </li>
          ))}
          <li>
            <Chip onClick={() => setPicking(true)}>
              + Emne
            </Chip>
          </li>
        </ul>
        <p className="t-caption discover__note">
          {topics.length
            ? 'Opslag fra dine emner vises nedenfor. Filteret følger dine indstillinger.'
            : 'Ingen emner valgt. Du ser de aktuelle opslag.'}
        </p>
        <div className="discover__buttons">
          {topics.length > 0 && (
            <Button variant="ghost" onClick={() => setTopics([])}>
              Ryd filter
            </Button>
          )}
          <Button variant="secondary" className="discover__save" onClick={saveFilter}>
            Gem filter
          </Button>
        </div>
      </Accordion>

      <Accordion
        title="Aktuelle emner"
        summary={trend ?? trends.slice(0, 3).join(', ')}
        open={trendOpen}
        onToggle={() => setTrendOpen((v) => !v)}
      >
        <p className="t-caption discover__note">
          I dit område og på dit sprog lige nu. Ens for alle, ikke tilpasset dig.
        </p>
        <ul className="discover__chips" aria-label="Aktuelle emner">
          {trends.map((t) => (
            <li key={t}>
              <Chip selected={trend === t} onClick={() => setTrend((cur) => (cur === t ? null : t))}>
                {t}
              </Chip>
            </li>
          ))}
        </ul>
      </Accordion>

      <h2 className="t-heading-m">{trend ? `Opslag om ${trend}` : 'Opslag der matcher dit filter'}</h2>
      <div className="discover__posts">
        {shown.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onComment={p.linkable ? () => navigate(`/opslag/${p.id}?kommentarer`) : undefined}
            onShare={p.linkable ? () => navigate(`/opslag/${p.id}/del`) : undefined}
            onReport={p.linkable ? () => navigate(`/opslag/${p.id}/rapporter`) : undefined}
          />
        ))}
        {shown.length === 0 && <p className="t-body-s discover__intro">Ingen opslag lige nu.</p>}
      </div>

      <Sheet open={picking} onClose={closePicker} title="Tilføj emne" dim>
        <div className="discover__picker">
          <ul className="discover__chips" aria-label="Alle emner">
            {allTopics.map((t) => (
              <li key={t}>
                <Chip
                  selected={topics.includes(t)}
                  onClick={() => {
                    toggleTopic(t);
                    setAdded((a) => (a.includes(t) ? a : [...a, t]));
                  }}
                >
                  {t}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>
    </div>
  );
}
