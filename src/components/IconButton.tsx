import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import './IconButton.css';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  /** Læses op af skærmlæsere. Påkrævet, fordi knappen ikke har synlig tekst. */
  label: string;
  variant?: 'outline' | 'filled' | 'ghost';
  /** Mint prik, der viser noget ulæst */
  dot?: boolean;
};

/** Rund ikon-knap, 44 px. */
export function IconButton({ icon, label, variant = 'ghost', dot, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={dot ? `${label}, ulæst` : label}
      className={['icon-btn', `icon-btn--${variant}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon name={icon} />
      {dot && <span className="icon-btn__dot" aria-hidden="true" />}
    </button>
  );
}
