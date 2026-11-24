import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PostMenu } from '../../components/PostMenu';
import { VoteControl } from '../../components/VoteControl';
import { publicKind } from '../../data/publicProfiles';
import { setHidden, useHidden } from '../../state/posts';
import { Icon } from '../../components/Icon';
import { TabBar } from '../../components/TabBar';
import { flicks as allFlicks, type Flick, type FlickSource } from '../../data/flicks';
import { isBuried, scoreWith, useVotes } from '../../state/votes';
import { FlickCommentsSheet } from './FlickCommentsSheet';
import { TopicsSheet } from '../discover/TopicsSheet';
import { inTopics, useTopics } from '../../state/topics';
import { at, handleOf } from '../../data/handles';
import './Flicks.css';

const modes: { source: FlickSource; label: string }[] = [
  // Samme emner som Offentlig debat, derfor samme navn som der
  { source: 'tildig', label: 'Dine emner' },
  { source: 'cirkel', label: 'Følger' },
];

/** Et punkt i feedet: en flick, eller en tom side, når ingen flicks passer til dine emner */
type Item = { kind: 'flick'; flick: Flick } | { kind: 'empty' };
const sourceOf = (item: Item): FlickSource => (item.kind === 'flick' ? item.flick.source : 'tildig');

/**
 * Flicks: korte lodrette videoer og billeder i fuld skærm.
 * Swipe op og ned; hver flick fylder hele skærmen (scroll-snap).
 * Skærmen har ingen topbar, men viser selv bundmenuen.
 * "Dine emner" henter fra de samme emner som Offentlig debat og deler filteret med den.
 */
export function Flicks() {
  const navigate = useNavigate();
  const feedRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { topics, active } = useTopics();
  // Flicks fra offentlige profiler med score -5 eller lavere forsvinder, som i Offentlig debat
  const votes = useVotes();
  const visible = allFlicks.filter((f) => !(publicKind(f.author) && isBuried(scoreWith(flickCounts(f.id).likes, votes[f.id]))));
  // Dine emner: kun flicks, der handler om de emner, der er slået til
  const mine = visible.filter((f) => f.source === 'tildig' && inTopics(f.tags, active));
  const items: Item[] = [
    ...(mine.length ? mine.map((f) => ({ kind: 'flick' as const, flick: f })) : [{ kind: 'empty' as const }]),
    ...visible.filter((f) => f.source === 'cirkel').map((f) => ({ kind: 'flick' as const, flick: f })),
  ];

  const current = items[Math.min(index, items.length - 1)]!;

  // Hvilken flick er på skærmen? (rundet til nærmeste hele skærm)
  const onScroll = () => {
    const el = feedRef.current;
    if (!el || !el.clientHeight) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== index) setIndex(Math.min(Math.max(i, 0), items.length - 1));
  };

  const scrollTo = (i: number, instant = false) => {
    const el = feedRef.current;
    if (!el) return;
    const reduce = instant || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: i * el.clientHeight, behavior: reduce ? 'auto' : 'smooth' });
  };

  // Piletaster skifter flick, når intet ark er åbent
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (commentsFor || editing) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollTo(Math.min(index + 1, items.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollTo(Math.max(index - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, commentsFor, editing, items.length]);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const closeComments = useCallback(() => setCommentsFor(null), []);
  const closeTopics = useCallback(() => setEditing(false), []);

  // Skifter man emner, starter "Dine emner" forfra
  const filterKey = active.join('|');
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    scrollTo(0, true);
    setIndex(0);
  }, [filterKey]);

  return (
    <div className="flicks">
      <h1 className="visually-hidden">Flicks</h1>

      <div className="flicks__chrome">
        {/* Dine emner / Følger. Valgt = hvid. Følger den flick, der vises.
            Dine emner har sin egen justér-knap i samme pille, som åbner de samme emner som Offentlig debat. */}
        <div className="flicks__top" role="group" aria-label="Vælg feed">
          {modes.map((m) => {
            const on = sourceOf(current) === m.source;
            const go = () => {
              const first = items.findIndex((it) => sourceOf(it) === m.source);
              if (first >= 0) scrollTo(first);
            };
            const cls = ['flicks__mode', on && 'flicks__mode--on'].filter(Boolean).join(' ');
            if (m.source !== 'tildig') {
              return (
                <button key={m.source} type="button" aria-pressed={on} className={cls} onClick={go}>
                  {m.label}
                </button>
              );
            }
            return (
              <div key={m.source} className={`${cls} flicks__mode--split`}>
                <button type="button" aria-pressed={on} className="flicks__mode-part" onClick={go}>
                  {m.label}
                </button>
                <button type="button" className="flicks__mode-part flicks__mode-edit" aria-label="Rediger dine emner" onClick={() => setEditing(true)}>
                  <Icon name="sliders" size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flicks__feed" ref={feedRef} onScroll={onScroll} aria-label="Flicks" role="feed" aria-busy="false">
        {items.map((it, i) =>
          it.kind === 'empty' ? (
            <article key="empty" className="flick flick--dark flick--empty" aria-posinset={i + 1} aria-setsize={items.length}>
              <div className="flick__empty">
                <p className="t-heading-m">Ingen flicks om dine emner lige nu</p>
                <button type="button" className="t-label flick__undo" onClick={() => setEditing(true)}>
                  Rediger emner
                </button>
              </div>
            </article>
          ) : (
            <FlickView
              key={it.flick.id}
              flick={it.flick}
              position={i + 1}
              total={items.length}
              why={whyFlick(it.flick, topics)}
              saved={saved.includes(it.flick.id)}
              onSave={() => setSaved((s) => toggle(s, it.flick.id))}
              onComments={() => setCommentsFor(it.flick.id)}
              // Samme deling som alle andre opslag: Besked, Opslag eller Moment
              onShare={() => navigate(`/opslag/${it.flick.id}/del`)}
            />
          ),
        )}
      </div>

      <TabBar />

      <FlickCommentsSheet open={commentsFor !== null} onClose={closeComments} />
      <TopicsSheet open={editing} onClose={closeTopics} />
    </div>
  );
}

type FlickViewProps = {
  flick: Flick;
  position: number;
  total: number;
  why: string;
  saved: boolean;
  onSave: () => void;
  onComments: () => void;
  onShare: () => void;
};

function FlickView({ flick, position, total, why, saved, onSave, onComments, onShare }: FlickViewProps) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const hidden = useHidden(flick.id);
  const counts = flickCounts(flick.id);
  return (
    <article
      className={`flick flick--${flick.placeholder}`}
      aria-posinset={position}
      aria-setsize={total}
      aria-label={`${flick.author}: ${flick.text}`}
    >
      {flick.image && <img className="flick__photo" src={flick.image} alt="" />}

      {/* ⋯ øverst til højre, præcis som på opslag */}
      <button type="button" className="flick__more" aria-label="Flere muligheder" aria-haspopup="dialog" onClick={() => setMenu(true)}>
        <Icon name="dots" />
      </button>
      <PostMenu
        noun="flick"
        open={menu}
        onClose={() => setMenu(false)}
        why={why}
        onHide={() => setHidden(flick.id, true)}
        onReport={() => navigate(`/opslag/${flick.id}/rapporter`)}
      />

      {hidden && (
        <div className="flick__hidden">
          <p className="t-body-s">
            <strong>Flicken er skjult.</strong> Du ser færre flicks som denne.
          </p>
          <button type="button" className="t-caption-strong flick__undo" onClick={() => setHidden(flick.id, false)}>
            Fortryd
          </button>
        </div>
      )}


      <div className="flick__bottom">
        <div className="flick__actions">
          {/* Som opslag: almindelige brugere kun op, offentlige personer og sider op og ned */}
          <VoteControl id={flick.id} base={counts.likes} allowDown={publicKind(flick.author) !== null} variant="stack" />
          <FlickAction icon="chat" label="Kommentarer" count={counts.comments} onClick={onComments} />
          <FlickAction icon="send" label="Delinger" count={counts.shares} onClick={onShare} />
          <FlickAction icon="bookmark" label="Gem" pressed={saved} className={saved ? 'flick__saved' : undefined} onClick={onSave} />
        </div>

        <div className="flick__caption">
          <p className="t-heading-s flick__author">
            <Link to={`/bruger/${handleOf(flick.author)}`} className="flick__author-link">
              {at(flick.author)}
            </Link>
          </p>
          <p className="t-body-s flick__text">{flick.text}</p>
          {flick.tags && flick.tags.length > 0 && (
            <p className="t-caption-strong flick__tags">{flick.tags.map((t) => `#${t}`).join('  ')}</p>
          )}
        </div>
      </div>
    </article>
  );
}


/** Forklaringen bag "Hvorfor ser jeg denne flick?" (tidligere den grønne linje) */
function whyFlick(f: Flick, topics: string[]) {
  const topic = f.source === 'tildig' ? f.tags?.find((t) => topics.includes(t)) : undefined;
  if (topic) return `Flicken handler om ${topic}, som er et af dine emner.`;
  if (f.friends?.length) return `${f.friends.map((p) => p.name.split(' ')[0]).join(' og ')}, som du følger, har liket den.`;
  return `Du følger ${f.author}.`;
}

/** Faste eksempeltal pr. flick */
function flickCounts(id: string) {
  let h = 11;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { likes: 120 + (h % 2400), comments: 8 + ((h >>> 5) % 180), shares: 3 + ((h >>> 11) % 90) };
}

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} t.` : String(n));

type FlickActionProps = {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  count?: number;
  pressed?: boolean;
  className?: string;
  onClick: () => void;
};

/** Ikon med antal under (antal vises ikke for Gem) */
function FlickAction({ icon, label, count, pressed, className, onClick }: FlickActionProps) {
  return (
    <button
      type="button"
      className={['flick__act', className].filter(Boolean).join(' ')}
      aria-label={count ? `${label}: ${count}` : label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon name={icon} size={28} />
      {count !== undefined && <span className="t-caption-strong">{fmtCount(count)}</span>}
    </button>
  );
}
