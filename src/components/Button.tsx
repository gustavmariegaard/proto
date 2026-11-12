import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

type Variant = 'primary' | 'secondary' | 'highlight' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Fylder hele bredden (fx på log ind-skærme) */
  block?: boolean;
};

/**
 * Pille-knap, 44 px høj.
 * Primary til hovedhandling, Secondary til alternativ,
 * Highlight sparsomt, Ghost til mindre vigtige handlinger.
 */
export function Button({ variant = 'primary', block, className, type = 'button', ...rest }: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
