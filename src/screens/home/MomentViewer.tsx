import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { moments, people } from '../../data/sample';
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

      <div className="moment-full__top">
        {/* Én streg pr. moment. Den aktive fyldes op og skifter, når den er fuld. */}
        <ol className="moment-full__bars" aria-label={`Moment ${index + 1} af ${own.length}`}>
          {own.map((m, i) => (
            <li key={m.id} className={i < index ? 'is-done' : undefined}>
              {i === index && (
                <span
                  key={`${personId}-${index}`}
                  className="moment-full__fill"
                  style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  onAnimationEnd={next}
                />
              )}
            </li>
          ))}
        </ol>
        <div className="moment-full__head">
          <div className="moment-full__who">
            <Avatar name={person.fullName} tone={person.tone} size="S" src={person.avatarSrc} />
            <span className="t-heading-s">{person.name}</span>
            <span className="t-caption moment-view__time">{current.time}</span>
          </div>
          <button type="button" className="moment-view__close" aria-label="Luk" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div className="moment-full__spacer" />

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
