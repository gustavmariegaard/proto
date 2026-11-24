import './Wordmark.css';

/**
 * Appens navn: ciircle. Kun sorte bogstaver.
 * Bruges altid alene, uden ekstra tekst ved siden af.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} role="img" aria-label="ciircle">
      <span aria-hidden="true">ciircle</span>
    </span>
  );
}
