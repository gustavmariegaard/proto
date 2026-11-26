import { useState } from 'react';
import { setStance, tally, useStances, type Stance } from '../state/stances';
import { Icon } from './Icon';
import './StanceBar.css';

const fmt = (n: number) => n.toLocaleString('da-DK');

/**
 * Enig / uenig i Offentlig debat.
 * Før man stemmer: to tydelige knapper og "Vis stemmer". Fordelingen vises
 * først, når man har stemt eller valgt at se den. Bagefter kan man skifte mening.
 */
export function StanceBar({ id }: { id: string }) {
  const mine = useStances()[id];
  const [peek, setPeek] = useState(false);
  const t = tally(id, mine);

  if (!mine && !peek) {
    return (
      <div className="stance" role="group" aria-label="Er du enig?">
        <button type="button" className="stance__choice" onClick={() => setStance(id, 'enig')}>
          <ThumbIcon />
          <span className="t-label">Enig</span>
        </button>
        <button type="button" className="stance__choice" onClick={() => setStance(id, 'uenig')}>
          <ThumbIcon down />
          <span className="t-label">Uenig</span>
        </button>
        <button type="button" className="t-caption-strong stance__peek" onClick={() => setPeek(true)}>
          Vis stemmer
        </button>
      </div>
    );
  }

  const side = (s: Stance, label: string, pct: number) => (
    <button
      type="button"
      className={['stance__side', `stance__side--${s}`, mine === s && 'stance__side--on'].filter(Boolean).join(' ')}
      aria-pressed={mine === s}
      aria-label={`${label}, ${pct} procent${mine === s ? ', din stemme' : ''}`}
      onClick={() => setStance(id, s)}
    >
      {mine === s && <Icon name="check" size={16} />}
      <span className="t-label">{label}</span>
      <span className="t-label stance__pct">{pct} %</span>
    </button>
  );

  return (
    <div className="stance stance--open">
      <div className="stance__labels" role="group" aria-label="Er du enig?">
        {side('enig', 'Enig', t.pct)}
        {side('uenig', 'Uenig', 100 - t.pct)}
        {/* Kun når man har kigget uden at stemme: tilbage til knapperne */}
        {!mine && (
          <button type="button" className="t-caption-strong stance__peek" onClick={() => setPeek(false)}>
            Skjul stemmer
          </button>
        )}
      </div>
      <div className="stance__bar" aria-hidden="true">
        <span className="stance__fill" style={{ width: `${t.pct}%` }} />
      </div>
      <p className="t-caption stance__total" aria-live="polite">
        {fmt(t.total)} {t.total === 1 ? 'stemme' : 'stemmer'} i alt
      </p>
    </div>
  );
}

/** Tommel op / ned (findes ikke i ikon-sættet) */
function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={down ? { transform: 'scaleY(-1)' } : undefined}>
      <path
        d="M7 10V20M7 10L11 3C12.7 3 13.5 4.2 13 5.8L12 9H18.2C19.5 9 20.4 10.2 20.1 11.4L18.6 18.4C18.4 19.3 17.6 20 16.6 20H4V10H7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
