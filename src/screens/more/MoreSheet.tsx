import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import '../../components/Avatar.css';
import { Icon } from '../../components/Icon';
import { img } from '../../data/sample';
import { moreTiles } from '../../data/more';
import { useSession } from '../../state/session';
import './MoreSheet.css';

/**
 * Mere-arket (Figma "Mere-ark"): glider op over Hjem, mens bundmenuen
 * bliver liggende ovenpå. Luk ved at trykke på hinden, trække arket ned
 * eller trykke Esc.
 *
 * Arket lægges ind i appens ramme (.shell), så det ligger under bundmenuen.
 */
export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const { profile } = useSession();
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef(0);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientY;
    setDrag(0);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag !== null) setDrag(Math.max(0, e.clientY - start.current));
  };
  const onPointerUp = () => {
    if (drag === null) return;
    const d = drag;
    setDrag(null);
    if (d > 80 || d < 6) onClose();
  };

  const name = profile.name.trim() || 'Dit navn';
  const avatar = profile.avatar ?? img('mig.jpg');
  const host = document.querySelector('.shell') ?? document.getElementById('root') ?? document.body;

  return createPortal(
    <div className="more-sheet-layer">
      <div className="more-sheet-layer__scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="more-sheet"
        style={drag !== null ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <button
          type="button"
          className="more-sheet__handle"
          aria-label="Luk Mere"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <span className="more-sheet__bar" />
        </button>
        <h2 id={titleId} className="t-title-l more-sheet__title">Mere</h2>

        <Link to="/profil" className="more-sheet__profile">
          <span className="avatar avatar--M avatar--blue more-sheet__avatar" aria-hidden="true">
            <img src={avatar} alt="" />
          </span>
          <span className="more-sheet__profile-text">
            <span className="t-heading-s more-sheet__ellipsis">{name}</span>
            <span className="t-caption more-sheet__muted">Se din profil</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </Link>

        <ul className="more-sheet__tiles">
          {moreTiles.map((tile) => (
            <li key={tile.label}>
              <Link to={tile.to} className="more-sheet__tile">
                <span className="more-sheet__tile-icon" aria-hidden="true">
                  <Icon name={tile.icon} size={20} />
                </span>
                <span className="t-label more-sheet__ellipsis">{tile.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    host,
  );
}
