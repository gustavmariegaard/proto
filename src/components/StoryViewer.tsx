import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { SideProgress } from './SideProgress';
import '../screens/home/MomentViewer.css';
import '../screens/profile/Screens.css';

/** Et billede eller en video i en samling (videoer genkendes på .mp4) */
export const isVideo = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

const DURATION = 5000; // 5 sekunder pr. billede; videoer varer, så længe de er
const HOLD = 220;

type Props = {
  items: string[];
  title: string;
  /** Under titlen, fx "@mette.lund" */
  subtitle?: string;
  startAt?: number;
  onClose: () => void;
  actions?: React.ReactNode;
};

/**
 * Afspiller en samling som en story highlight: billeder i 5 sekunder, videoer i deres fulde længde.
 * Tryk til højre for næste, til venstre for forrige. Hold fingeren nede for at pause.
 */
export function StoryViewer({ items, title, subtitle, startAt = 0, onClose, actions }: Props) {
  const [index, setIndex] = useState(Math.min(Math.max(startAt, 0), Math.max(items.length - 1, 0)));
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  const pressStart = useRef(0);
  const wasHold = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = items[index]!;
  const video = isVideo(current);

  const goTo = useCallback(
    (i: number) => {
      if (i >= items.length) return onClose();
      elapsed.current = 0;
      setProgress(0);
      setIndex(Math.max(0, i));
    },
    [items.length, onClose],
  );

  // Billeder: fremdrift i JS, så en pause fortsætter præcis, hvor den slap
  useEffect(() => {
    if (held || video) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= DURATION) return goTo(index + 1);
      setProgress(elapsed.current / DURATION);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [held, index, video, goTo]);

  // Videoer: følg videoens egen tid, og pause den, når man holder
  useEffect(() => {
    const v = videoRef.current;
    if (!video || !v) return;
    if (held) {
      v.pause();
      return;
    }
    v.play().catch(() => {});
    let frame = requestAnimationFrame(function tick() {
      if (v.duration) setProgress(v.currentTime / v.duration);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [held, index, video]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goTo, index]);

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

  const videos = items.filter(isVideo).length;
  const count = [items.length - videos && `${items.length - videos} ${items.length - videos === 1 ? 'billede' : 'billeder'}`, videos && `${videos} ${videos === 1 ? 'video' : 'videoer'}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="moment-view moment-view--full pf-viewer story-viewer" role="dialog" aria-label={`Samlingen ${title}`}>
      {/* Billedet eller videoen fylder hele skærmen. Tryk til siden skifter, hold nede = pause. */}
      <div className={['moment-full__photo', held && 'is-held'].filter(Boolean).join(' ')}>
        {video ? (
          <video
            key={`${current}-${index}`}
            ref={videoRef}
            src={current}
            muted
            playsInline
            autoPlay
            preload="auto"
            onEnded={() => goTo(index + 1)}
            aria-label={`Video ${index + 1}`}
          />
        ) : (
          <img src={current} alt="" draggable={false} />
        )}
        <button type="button" className="moment-view__tap moment-view__tap--prev pf-viewer__tap" aria-label="Forrige" onClick={() => tap(-1)} {...holdProps} />
        <button type="button" className="moment-view__tap moment-view__tap--next pf-viewer__tap" aria-label="Næste" onClick={() => tap(1)} {...holdProps} />
      </div>

      {/* Fremdrift som stories, men i bunden af skærmen */}
      <SideProgress count={items.length} index={index} progress={progress} />

      <div className="moment-full__top story-viewer__top">
        <div className="story-viewer__title">
          <span className="t-heading-s">{title}</span>
          <span className="t-caption">
            {subtitle ?? count}
            {video && ' · Video'}
          </span>
        </div>
        <button type="button" className="moment-view__close" aria-label="Luk" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className="moment-full__spacer" />

      {actions && <div className="pf-viewer__actions story-viewer__actions">{actions}</div>}
    </div>
  );
}
