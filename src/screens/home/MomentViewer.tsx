import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { at } from '../../data/handles';
import { moments, pageAccounts, people } from '../../data/sample';
import { useMoments } from '../../state/moments';
import './MomentViewer.css';

const DURATION = 5000; // 5 sekunder pr. moment

/** Moment i fuld skærm. Tryk til højre for næste, til venstre for forrige. */
export function MomentViewer() {
  const { personId = '' } = useParams();
  // Ny person = ny visning, så alt starter forfra
  return <Viewer key={personId} personId={personId} />;
}

function Viewer({ personId }: { personId: string }) {
  const navigate = useNavigate();
  const { markSeen } = useMoments();
  const [index, setIndex] = useState(0);
  // Pause, når man skriver et svar, eller holder fingeren på billedet
  const [typing, setTyping] = useState(false);
  const [held, setHeld] = useState(false);
  const paused = typing || held;
  const holdTimer = useRef<number | undefined>(undefined);
  const wasHeld = useRef(false);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState('');

  // Personer (Hjem › Brugere) og sider (Hjem › Interesser) bladres hver for sig
  const isPage = personId in pageAccounts;
  const accounts = isPage ? pageAccounts : people;
  const personIds = Object.keys(accounts);
  const person = accounts[personId];
  const own = moments.filter((m) => m.personId === personId);
  const current = own[index];

  const close = useCallback(
    () => navigate(isPage ? '/?feed=interesser' : '/', { replace: true }),
    [navigate, isPage],
  );

  const next = useCallback(() => {
    if (index < own.length - 1) return setIndex((i) => i + 1);
    const nextPerson = personIds[personIds.indexOf(personId) + 1];
    if (nextPerson) navigate(`/moment/${nextPerson}`, { replace: true });
    else close();
  }, [index, own.length, personIds, personId, navigate, close]);

  const prev = () => {
    if (index > 0) return setIndex((i) => i - 1);
    const prevPerson = personIds[personIds.indexOf(personId) - 1];
    if (prevPerson) navigate(`/moment/${prevPerson}`, { replace: true });
  };

  // Marker personens moments som set
  useEffect(() => {
    if (person) markSeen(personId);
  }, [person, personId, markSeen]);

  /* Hold fingeren nede = pause. Slip = fortsæt, hvor den slap. Et kort tryk skifter moment. */
  const pressStart = () => {
    wasHeld.current = false;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      wasHeld.current = true;
      setHeld(true);
    }, 180);
  };
  const pressEnd = () => {
    window.clearTimeout(holdTimer.current);
    setHeld(false);
  };
  /** Ignorer klikket, der kommer, når man slipper efter at have holdt */
  const tap = (go: () => void) => () => {
    if (wasHeld.current) {
      wasHeld.current = false;
      return;
    }
    go();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!person || !current) return <Navigate to="/" replace />;

  return (
    <div className="moment-view moment-view--full" role="dialog" aria-label={`Moment fra ${person.name}`}>
      {/* Billedet fylder hele skærmen. Tryk til siden skifter, hold nede = pause. */}
      <div
        className={['moment-full__photo', held && 'is-held'].filter(Boolean).join(' ')}
        onPointerDown={pressStart}
        onPointerUp={pressEnd}
        onPointerCancel={pressEnd}
        onPointerLeave={pressEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {current.image ? <img src={current.image} alt="" draggable={false} /> : null}
        <button type="button" className="moment-view__tap moment-view__tap--prev" aria-label="Forrige" onClick={tap(prev)} />
        <button type="button" className="moment-view__tap moment-view__tap--next" aria-label="Næste" onClick={tap(next)} />
      </div>

      {/* Den grønne ramme løber rundt langs skærmens kant (ciircles signatur fra Figma) */}
      <EdgeProgress
        key={`${personId}-${index}`}
        paused={paused}
        duration={DURATION}
        onDone={next}
      />

      <div className="moment-full__top">
        {/* Prikkerne vises kun, når personen har mere end ét moment */}
        {own.length > 1 ? (
          <ol className="moment-view__dots" aria-label={`Moment ${index + 1} af ${own.length}`}>
            {own.map((m, i) => (
              <li key={m.id} className={i === index ? 'is-active' : undefined} />
            ))}
          </ol>
        ) : (
          <span />
        )}
        <button type="button" className="moment-view__close" aria-label="Luk" onClick={close}>
          <Icon name="close" />
        </button>
      </div>

      <div className="moment-full__spacer" />

      <div className="moment-view__who moment-full__who">
        <Avatar name={person.fullName} tone={person.tone} size="S" src={person.avatarSrc} />
        <span className="t-heading-s">{at(person.fullName)}</span>
        <span className="t-caption moment-view__time">{current.time}</span>
      </div>

      <form
        className="moment-view__reply"
        onSubmit={(e) => {
          e.preventDefault();
          setReply('');
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <input
          className="moment-view__field"
          placeholder={`Svar ${person.name}`}
          aria-label={`Svar ${person.name}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          enterKeyHint="send"
        />
        <button
          type="button"
          className="moment-view__like"
          aria-label="Synes godt om"
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
        >
          <Icon name={liked ? 'heart-filled' : 'heart'} />
        </button>
      </form>
    </div>
  );
}

/**
 * Fremdrift som en ramme langs skærmens kant. Starter øverst i midten og
 * løber med uret hele vejen rundt. Står stille, når `paused` er sand.
 */
function EdgeProgress({ paused, duration, onDone }: { paused: boolean; duration: number; onDone: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inset = 3; // halv stregbredde + lidt luft
  const r = 44; // følger hjørnerne på nyere iPhones
  const { w, h } = size;
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const ri = r - inset;
  const d = `M ${w / 2} ${y0} H ${x1 - ri} A ${ri} ${ri} 0 0 1 ${x1} ${y0 + ri} V ${y1 - ri} A ${ri} ${ri} 0 0 1 ${x1 - ri} ${y1} H ${x0 + ri} A ${ri} ${ri} 0 0 1 ${x0} ${y1 - ri} V ${y0 + ri} A ${ri} ${ri} 0 0 1 ${x0 + ri} ${y0} Z`;

  return (
    <svg ref={ref} className="moment-edge" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} className="moment-edge__track" />
      <path
        d={d}
        pathLength={100}
        className="moment-view__bar moment-edge__bar"
        style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        onAnimationEnd={onDone}
      />
    </svg>
  );
}
