import { useNavigate } from 'react-router-dom';
import { IconButton } from '../../components/IconButton';
import '../../components/PageHeader.css';
import './parts.css';

/** Går ét skridt tilbage, eller til `fallback`, hvis siden er åbnet direkte. */
export function useClose(fallback = '/') {
  const navigate = useNavigate();
  return () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

/** Sidehoved med luk-knap (X), titel og evt. en handling til højre. */
export function CloseHeader({
  title,
  onClose,
  closeLabel = 'Luk',
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <IconButton icon="close" label={closeLabel} variant="outline" onClick={onClose} />
      <h1 className="page-header__title">{title}</h1>
      {children}
    </header>
  );
}

/** Til/fra-kontakt, 48 × 28 px. Selve trykfladen er hele rækken. */
export function Toggle({ on }: { on: boolean }) {
  return <span className={['toggle', on && 'toggle--on'].filter(Boolean).join(' ')} aria-hidden="true" />;
}

/** Kort med rækker af indstillinger, hver med en kontakt. */
export function ToggleList({
  rows,
  values,
  onToggle,
}: {
  rows: { id: string; title: string; hint: string }[];
  values: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="toggle-list">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            role="switch"
            aria-checked={values[row.id]}
            className="toggle-list__row"
            onClick={() => onToggle(row.id)}
          >
            <span className="toggle-list__text">
              <span className="t-label">{row.title}</span>
              <span className="t-caption toggle-list__hint">{row.hint}</span>
            </span>
            <Toggle on={!!values[row.id]} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Rund valgknap tegnet i CSS. */
export function RadioDot({ on, size = 24 }: { on: boolean; size?: 22 | 24 }) {
  return (
    <span
      className={['radio-dot', on && 'radio-dot--on'].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
