import { Button } from './Button';
import './SaveBar.css';

/**
 * Vises nederst, når der er ændringer, der ikke er gemt.
 * Ændringerne træder først i kraft, når man trykker "Gem".
 */
export function SaveBar({ dirty, onSave, onReset, note }: { dirty: boolean; onSave: () => void; onReset: () => void; note?: string }) {
  if (!dirty) return null;
  return (
    <div className="savebar" role="region" aria-label="Ændringer, der ikke er gemt">
      <p className="t-caption savebar__text" aria-live="polite">
        {note ?? 'Du har ændringer, der ikke er gemt.'}
      </p>
      <div className="savebar__buttons">
        <Button variant="secondary" onClick={onReset}>
          Fortryd
        </Button>
        <Button onClick={onSave}>Gem ændringer</Button>
      </div>
    </div>
  );
}

/** Kort bekræftelse efter gem */
export function SavedToast({ show }: { show: boolean }) {
  return show ? (
    <p className="savebar__toast t-caption-strong" role="status">
      Ændringerne er gemt
    </p>
  ) : null;
}
