import type { InputHTMLAttributes } from 'react';
import './TextField.css';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Læses op af skærmlæsere. Vises ikke, fordi pladsholderen siger det samme. */
  label: string;
};

/** Tekstfelt i pilleform, 44 px højt. */
export function TextField({ label, className, ...rest }: TextFieldProps) {
  return (
    <input
      aria-label={label}
      placeholder={label}
      className={['field', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
