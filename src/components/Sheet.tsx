import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Sheet.css';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Halv højde (som i Figma) eller næsten hele skærmen */
  initialSize?: 'half' | 'full';
  /** Fast nederst, fx et tekstfelt */
  footer?: React.ReactNode;
  /** Mørk hinde bag arket */
  dim?: boolean;
  children: React.ReactNode;
};

/**
 * Ark, der glider op nedefra. Træk i håndtaget for at gøre det højere
 * eller lukke det. Esc lukker også.
 */
export function Sheet({ open, onClose, title, initialSize = 'half', footer, dim, children }: SheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(initialSize);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    if (!open) return;
    setSize(initialSize);
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, initialSize, onClose]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientY;
    setDrag(0);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    setDrag(e.clientY - start.current);
  };
  const onPointerUp = () => {
    if (drag === null) return;
    const d = drag;
    setDrag(null);
    if (Math.abs(d) < 6) {
      // Et tryk på håndtaget skifter mellem halv og hel højde
      setSize((s) => (s === 'half' ? 'full' : 'half'));
    } else if (d < -60) setSize('full');
    else if (d > 80) {
      if (size === 'full') setSize('half');
      else onClose();
    }
  };

  const host = document.getElementById('root') ?? document.body;
  return createPortal(
    <div className={['sheet-layer', dim && 'sheet-layer--dim'].filter(Boolean).join(' ')}>
      <div className="sheet-layer__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`sheet sheet--${size}`}
        style={drag !== null ? { transform: `translateY(${Math.max(drag, -40)}px)`, transition: 'none' } : undefined}
      >
        <button
          type="button"
          className="sheet__handle"
          aria-label={size === 'half' ? 'Vis hele arket' : 'Gør arket mindre'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSize((s) => (s === 'half' ? 'full' : 'half'));
            }
          }}
        >
          <span className="sheet__bar" />
        </button>
        <h2 id={titleId} className="sheet__title t-heading-m">{title}</h2>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__footer">{footer}</div>}
      </div>
    </div>,
    host,
  );
}
