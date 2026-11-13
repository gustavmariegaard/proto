import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconButton } from '../../components/IconButton';
import { Icon } from '../../components/Icon';
import { TabBar } from '../../components/TabBar';
import { flicks, type Flick, type FlickSource } from '../../data/flicks';
import { FlickCommentsSheet } from './FlickCommentsSheet';
import { FlickShareSheet } from './FlickShareSheet';
import { at, handleOf } from '../../data/handles';
import './Flicks.css';

const modes: { source: FlickSource; label: string }[] = [
  { source: 'tildig', label: 'Til dig' },
  { source: 'cirkel', label: 'Cirkel' },
];

/**
 * Flicks: korte lodrette videoer og billeder i fuld skærm.
 * Swipe op og ned; hver flick fylder hele skærmen (scroll-snap).
 * Skærmen har ingen topbar, men viser selv bundmenuen.
 */
export function Flicks() {
  const feedRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<string | null>(null);

  const current = flicks[index] ?? flicks[0]!;

  // Hvilken flick er på skærmen? (rundet til nærmeste hele skærm)
  const onScroll = () => {
    const el = feedRef.current;
    if (!el || !el.clientHeight) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== index) setIndex(Math.min(Math.max(i, 0), flicks.length - 1));
    if (el.scrollTop > 8 && !hasSwiped) setHasSwiped(true);
  };

  const scrollTo = (i: number) => {
    const el = feedRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: i * el.clientHeight, behavior: reduce ? 'auto' : 'smooth' });
  };

  // Piletaster skifter flick, når intet ark er åbent
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (commentsFor || shareFor) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollTo(Math.min(index + 1, flicks.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollTo(Math.max(index - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, commentsFor, shareFor]);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const closeComments = useCallback(() => setCommentsFor(null), []);
  const closeShare = useCallback(() => setShareFor(null), []);

  return (
    <div className="flicks">
      <h1 className="visually-hidden">Flicks</h1>

      {/* Til dig / Cirkel. Valgt = hvid. Følger den flick, der vises. */}
      <div className="flicks__top" role="group" aria-label="Vælg feed">
        {modes.map((m) => {
          const on = current.source === m.source;
          return (
            <button
              key={m.source}
              type="button"
              aria-pressed={on}
              className={['flicks__mode', on && 'flicks__mode--on'].filter(Boolean).join(' ')}
              onClick={() => {
                const first = flicks.findIndex((f) => f.source === m.source);
                if (first >= 0) scrollTo(first);
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flicks__feed" ref={feedRef} onScroll={onScroll} aria-label="Flicks" role="feed" aria-busy="false">
        {flicks.map((f, i) => (
          <FlickView
            key={f.id}
            flick={f}
            position={i + 1}
            showHint={i < flicks.length - 1}
            bounce={!hasSwiped}
            onNext={() => {
              setHasSwiped(true);
              scrollTo(i + 1);
            }}
            liked={liked.includes(f.id)}
            saved={saved.includes(f.id)}
            onLike={() => setLiked((l) => toggle(l, f.id))}
            onSave={() => setSaved((s) => toggle(s, f.id))}
            onComments={() => setCommentsFor(f.id)}
            onShare={() => setShareFor(f.id)}
          />
        ))}
      </div>

      <TabBar />

      <FlickCommentsSheet open={commentsFor !== null} onClose={closeComments} />
      <FlickShareSheet open={shareFor !== null} onClose={closeShare} />
    </div>
  );
}

type FlickViewProps = {
  flick: Flick;
  position: number;
  showHint: boolean;
  /** Hopper let, indtil man har swipet første gang */
  bounce: boolean;
  onNext: () => void;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onComments: () => void;
  onShare: () => void;
};

function FlickView({ flick, position, showHint, bounce, onNext, liked, saved, onLike, onSave, onComments, onShare }: FlickViewProps) {
  return (
    <article
      className={`flick flick--${flick.placeholder}`}
      aria-posinset={position}
      aria-setsize={flicks.length}
      aria-label={`${flick.author}: ${flick.text}`}
    >
      {flick.image && <img className="flick__photo" src={flick.image} alt="" />}

      {showHint && <SwipeHint bounce={bounce} onNext={onNext} />}

      <div className="flick__bottom">
        <div className="flick__actions">
          <IconButton
            variant="outline"
            icon={liked ? 'heart-filled' : 'heart'}
            label="Synes godt om"
            aria-pressed={liked}
            onClick={onLike}
          />
          <IconButton variant="outline" icon="chat" label="Kommentarer" aria-haspopup="dialog" onClick={onComments} />
          <IconButton variant="outline" icon="send" label="Del" aria-haspopup="dialog" onClick={onShare} />
          <IconButton
            variant="outline"
            icon="bookmark"
            label="Gem"
            aria-pressed={saved}
            className={saved ? 'flick__saved' : undefined}
            onClick={onSave}
          />
        </div>

        <div className="flick__caption">
          <p className="flick__reason">
            {flick.friends && (
              <span className="flick__friends" aria-hidden="true">
                {flick.friends.map((p) => (
                  <span key={p.name} className={`flick__friend flick__friend--${p.tone}`}>
                    {p.avatarSrc && <img src={p.avatarSrc} alt="" />}
                  </span>
                ))}
              </span>
            )}
            <span className="t-caption-strong">{flick.reason}</span>
          </p>
          <p className="t-heading-s flick__author">
            <Link to={`/bruger/${handleOf(flick.author)}`} className="flick__author-link">
              {at(flick.author)}
            </Link>
          </p>
          <p className="t-body-s flick__text">{flick.text}</p>
        </div>
      </div>
    </article>
  );
}

/**
 * Swipe-pilen er interaktiv: tryk på den, eller træk den opad, for at gå til næste flick.
 * Den følger fingeren, og slipper man over 40 px oppe, skifter den.
 */
function SwipeHint({ bounce, onNext }: { bounce: boolean; onNext: () => void }) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const moved = useRef(false);

  return (
    <button
      type="button"
      className={['flick__hint', bounce && drag === 0 && 'flick__hint--bounce', drag < 0 && 'flick__hint--drag'].filter(Boolean).join(' ')}
      style={drag ? { transform: `translate(-50%, ${drag}px)` } : undefined}
      aria-label="Næste flick"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start.current = e.clientY;
        moved.current = false;
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        const dy = Math.min(0, Math.max(-90, e.clientY - start.current));
        if (dy < -4) moved.current = true;
        setDrag(dy);
      }}
      onPointerUp={() => {
        const go = drag < -40;
        start.current = null;
        setDrag(0);
        if (go) onNext();
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(0);
      }}
      onClick={() => {
        if (moved.current) {
          moved.current = false;
          return;
        }
        onNext();
      }}
    >
      <Icon name="chevron-right" className="flick__chevron flick__chevron--faint" />
      <Icon name="chevron-right" className="flick__chevron" />
    </button>
  );
}
