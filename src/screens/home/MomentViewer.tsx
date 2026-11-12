import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { moments, people } from '../../data/sample';
import { useMoments } from '../../state/moments';
import './MomentViewer.css';

const DURATION = 5000; // 5 sekunder pr. moment

/* Rammen om billedet: 331 × 576 px med 36 px hjørner. Starter øverst i midten. */
const W = 331;
const H = 576;
const R = 36;
const S = 2; // halv stregbredde, så stregen ikke klippes
const framePath = `M ${W / 2} ${S} H ${W - R} A ${R - S} ${R - S} 0 0 1 ${W - S} ${R} V ${H - R} A ${R - S} ${R - S} 0 0 1 ${W - R} ${H - S} H ${R} A ${R - S} ${R - S} 0 0 1 ${S} ${H - R} V ${R} A ${R - S} ${R - S} 0 0 1 ${R} ${S} Z`;

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

  const personIds = Object.keys(people);
  const person = people[personId];
  const own = moments.filter((m) => m.personId === personId);
  const current = own[index];

  const close = useCallback(() => navigate('/', { replace: true }), [navigate]);

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
    <div className="moment-view" role="dialog" aria-label={`Moment fra ${person.name}`}>
      <div className="moment-view__bg" aria-hidden="true">
        {current.image && <img src={current.image} alt="" />}
      </div>

      <div className="moment-view__top">
        <ol className="moment-view__dots" aria-label={`Moment ${index + 1} af ${own.length}`}>
          {own.map((m, i) => (
            <li key={m.id} className={i === index ? 'is-active' : undefined} />
          ))}
        </ol>
        <button type="button" className="moment-view__close" aria-label="Luk" onClick={close}>
          <Icon name="close" />
        </button>
      </div>

      <div className="moment-view__stage">
        <div
          className={['moment-view__frame', held && 'is-held'].filter(Boolean).join(' ')}
          onPointerDown={pressStart}
          onPointerUp={pressEnd}
          onPointerCancel={pressEnd}
          onPointerLeave={pressEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="moment-view__photo">
            {current.image ? <img src={current.image} alt="" draggable={false} /> : null}
          </div>
          <svg className="moment-view__progress" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <path d={framePath} className="moment-view__track" />
            <path
              key={`${personId}-${index}`}
              d={framePath}
              pathLength={100}
              className="moment-view__bar"
              style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }}
              // Næste moment, når rammen er løbet hele vejen rundt
              onAnimationEnd={next}
            />
          </svg>
          {/* Usynlige trykflader til forrige og næste */}
          <button type="button" className="moment-view__tap moment-view__tap--prev" aria-label="Forrige" onClick={tap(prev)} />
          <button type="button" className="moment-view__tap moment-view__tap--next" aria-label="Næste" onClick={tap(next)} />
        </div>
      </div>

      <div className="moment-view__who">
        <Avatar name={person.fullName} tone={person.tone} size="S" src={person.avatarSrc} />
        <span className="t-heading-s">{person.name}</span>
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
