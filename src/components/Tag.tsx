import './Tag.css';

/** Neutralt tekstmærke til korte oplysninger, fx status. */
export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}
