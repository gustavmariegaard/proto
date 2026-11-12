import type { ButtonHTMLAttributes } from 'react';
import './Chip.css';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  selected?: boolean;
};

/** Filter-chip. Valgt = mørk. Bruges til emner, kategorier og filtre. */
export function Chip({ selected = false, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={['chip', selected && 'chip--on', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
