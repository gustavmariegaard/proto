import './AuthPage.css';

type AuthPageProps = {
  /** Luft mellem frirummet og første element (fra Figma) */
  top?: number;
  /** Afstand mellem elementerne */
  gap?: number;
  /** Bundknapper, der altid står nederst */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Fuldskærmsside til velkomst, log ind og oprettelse.
 * Ingen topbar eller bundmenu. Midten ruller, bundknapperne står fast.
 */
export function AuthPage({ top = 40, gap = 16, footer, children, className }: AuthPageProps) {
  return (
    <div
      className={['auth', className].filter(Boolean).join(' ')}
      style={{ '--auth-top': `${top}px`, '--auth-gap': `${gap}px` } as React.CSSProperties}
    >
      <main className="auth__body">{children}</main>
      {footer && <div className="auth__footer">{footer}</div>}
    </div>
  );
}

/** Rækken øverst: tilbage-knap til venstre, sprog til højre */
export function AuthTop({ children }: { children: React.ReactNode }) {
  return <div className="auth__top">{children}</div>;
}
