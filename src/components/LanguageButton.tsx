import { Button } from './Button';

/** Sprogvælger. Kun dansk i prototypen. */
export function LanguageButton() {
  return (
    <Button variant="ghost" aria-label="Sprog: Dansk" className="lang-btn">
      Dansk <span aria-hidden="true" style={{ fontSize: 8, marginLeft: 4 }}>▼</span>
    </Button>
  );
}
