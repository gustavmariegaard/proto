import { BackButton } from './BackButton';
import './PageHeader.css';

/** Sidehoved med tilbage-knap og titel, 70 px under frirummet. */
export function PageHeader({ title, fallback = '/', children }: { title: string; fallback?: string; children?: React.ReactNode }) {
  return (
    <header className="page-header">
      <BackButton fallback={fallback} />
      <h1 className="page-header__title">{title}</h1>
      {children}
    </header>
  );
}
