import { setStance, tally, useStances, type Stance } from '../state/stances';
import { Icon } from './Icon';
import './StanceBar.css';

const fmt = (n: number) => n.toLocaleString('da-DK');

/**
 * Enig / uenig i Offentlig debat. Pillen er selv barometeret:
 * den grønne del viser andelen, der er enige. Tryk på en halvdel for at stemme.
 */
export function StanceBar({ id }: { id: string }) {
  const mine = useStances()[id];
  const t = tally(id, mine);
  const btn = (s: Stance, label: string, pct: number) => (
    <button
      type="button"
      className={['stance__btn', `stance__btn--${s}`, mine === s && 'stance__btn--on'].filter(Boolean).join(' ')}
      aria-pressed={mine === s}
      aria-label={`${label}, ${pct} procent`}
      onClick={() => setStance(id, s)}
    >
      {mine === s && <Icon name="check" size={16} />}
      <span className="t-label">{label}</span>
      {t.total > 0 && <span className="t-caption stance__pct">{pct} %</span>}
    </button>
  );
  return (
    <div className="stance">
      <div
        className="stance__bar"
        role="group"
        aria-label="Er du enig?"
        style={{ '--pct': `${t.total ? t.pct : 50}%` } as React.CSSProperties}
      >
        {btn('enig', 'Enig', t.pct)}
        {btn('uenig', 'Uenig', 100 - t.pct)}
      </div>
      <p className="t-caption stance__total" aria-live="polite">
        {t.total === 1 ? '1 stemme' : `${fmt(t.total)} stemmer`}
      </p>
    </div>
  );
}
