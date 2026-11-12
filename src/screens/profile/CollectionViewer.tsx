import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { collectionPhotos, useCollection } from './store';
import '../home/MomentViewer.css';
import './Screens.css';

const DURATION = 5000; // 5 sekunder pr. billede
const HOLD = 220; // så længe skal man holde, før det tæller som pause og ikke som tryk

/* Rammen om billedet: 331 × 576 px med 36 px hjørner (som Moments). Starter øverst i midten. */
const W = 331;
const H = 576;
const R = 36;
const S = 2;
const framePath = `M ${W / 2} ${S} H ${W - R} A ${R - S} ${R - S} 0 0 1 ${W - S} ${R} V ${H - R} A ${R - S} ${R - S} 0 0 1 ${W - R} ${H - S} H ${R} A ${R - S} ${R - S} 0 0 1 ${S} ${H - R} V ${R} A ${R - S} ${R - S} 0 0 1 ${R} ${S} Z`;

/**
 * Samling · Visning: afspiller samlingen som en historie.
 * Tryk til højre for næste, til venstre for forrige. Hold fingeren på billedet for at pause.
 */
export function CollectionViewer() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const collection = useCollection(id);
  const list = collection ? collectionPhotos(collection) : [];
  const startAt = Math.min(Math.max(Number(params.get('start')) || 0, 0), Math.max(list.length - 1, 0));

  const [index, setIndex] = useState(startAt);
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1 for det aktuelle billede
  const elapsed = useRef(0);
  const pressStart = useRef(0);
  const wasHold = useRef(false);

  const close = useCallback(() => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(`/profil/samling/${id}`, { replace: true });
  }, [navigate, id]);

  const goTo = useCallback(
    (i: number) => {
      if (i >= list.length) return close();
      elapsed.current = 0;
      setProgress(0);
      setIndex(Math.max(0, i));
    },
    [list.length, close],
  );

  // Fremdrift i JS, så en pause fortsætter præcis, hvor den slap
  useEffect(() => {
    if (held || list.length === 0) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= DURATION) {
        goTo(index + 1);
        return;
      }
      setProgress(elapsed.current / DURATION);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [held, index, list.length, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, goTo, index]);

  if (!collection || list.length === 0) return <Navigate to="/profil" replace />;
  const current = list[index]!;

  const press = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pressStart.current = performance.now();
    wasHold.current = false;
    setHeld(true);
  };
  const release = () => {
    if (!held) return;
    wasHold.current = performance.now() - pressStart.current > HOLD;
    setHeld(false);
  };
  const tap = (dir: 1 | -1) => {
    if (wasHold.current) {
      wasHold.current = false;
      return;
    }
    goTo(index + dir);
  };

  const holdProps = {
    onPointerDown: press,
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <div className="moment-view pf-viewer" role="dialog" aria-label={`Samlingen ${collection.title}`}>
      <div className="moment-view__bg" aria-hidden="true">
        <img src={current.src} alt="" />
      </div>

      <div className="moment-view__top">
        <ol className="moment-view__dots" aria-label={`Billede ${index + 1} af ${list.length}`}>
          {list.map((p, i) => (
            <li key={p.id} className={i === index ? 'is-active' : undefined} />
          ))}
        </ol>
        <button type="button" className="moment-view__close" aria-label="Luk" onClick={close}>
          <Icon name="close" />
        </button>
      </div>

      <div className="moment-view__stage">
        <div className="moment-view__frame">
          <div className="moment-view__photo">
            <img src={current.src} alt="" draggable={false} />
          </div>
          <svg className="moment-view__progress" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <path d={framePath} className="moment-view__track" />
            <path
              d={framePath}
              pathLength={100}
              className="pf-viewer__bar"
              style={{ strokeDashoffset: 100 - progress * 100 }}
            />
          </svg>
          <button type="button" className="moment-view__tap moment-view__tap--prev pf-viewer__tap" aria-label="Forrige" onClick={() => tap(-1)} {...holdProps} />
          <button type="button" className="moment-view__tap moment-view__tap--next pf-viewer__tap" aria-label="Næste" onClick={() => tap(1)} {...holdProps} />
        </div>
      </div>

      <div className="moment-view__who">
        <span className="t-heading-s">{collection.title}</span>
        <span className="t-caption moment-view__time">
          {list.length} {list.length === 1 ? 'billede' : 'billeder'}
        </span>
      </div>

      <div className="pf-viewer__actions">
        <button type="button" className="pf-viewer__action" onClick={close}>
          <Icon name="layout-grid" size={20} />
          Se alle
        </button>
        <button type="button" className="pf-viewer__action" onClick={() => navigate(`/profil/samling/${id}/rediger`, { replace: true })}>
          <Icon name="edit" size={20} />
          Rediger
        </button>
      </div>
    </div>
  );
}
