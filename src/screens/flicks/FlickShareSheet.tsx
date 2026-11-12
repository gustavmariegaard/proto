import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { shareTargets } from '../../data/flicks';
import './FlickShareSheet.css';

type Props = { open: boolean; onClose: () => void };

/**
 * Del-ark over en flick (Figma: Flicks · Del).
 * Personer og grupper til venstre, "Din Flick" og "Kopiér link" til højre.
 */
export function FlickShareSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatus('');
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* Udklipsholderen er ikke tilgængelig; arket lukker alligevel */
    }
    setStatus('Link kopieret');
    onClose();
  };

  return (
    <>
      {/* Læses op efter handlingen, også når arket er lukket */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {status}
      </p>
      {open && (
        <div className="fshare-layer">
          <button type="button" className="fshare-layer__scrim" aria-label="Luk" tabIndex={-1} onClick={onClose} />
          <div ref={ref} className="fshare" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
            <button type="button" className="fshare__handle" aria-label="Luk" onClick={onClose}>
              <span className="fshare__bar" />
            </button>
            <h2 id={titleId} className="t-title-l">
              Del
            </h2>
            <ul className="fshare__row">
              {shareTargets.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="fshare__item"
                    onClick={() => {
                      setStatus(`Delt med ${p.name}`);
                      onClose();
                    }}
                  >
                    <Avatar name={p.name} tone={p.tone} size="L" src={p.avatarSrc} />
                    <span className="t-caption">{p.name}</span>
                  </button>
                </li>
              ))}
              <li className="fshare__divider" aria-hidden="true" />
              <li>
                <button type="button" className="fshare__item" onClick={() => navigate('/flicks/ny')}>
                  <span className="fshare__tile" aria-hidden="true">
                    <Icon name="clip" />
                  </span>
                  <span className="t-caption">Din Flick</span>
                </button>
              </li>
              <li>
                <button type="button" className="fshare__item" onClick={copyLink}>
                  <span className="fshare__tile" aria-hidden="true">
                    <Icon name="link" />
                  </span>
                  <span className="t-caption">Kopiér link</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
