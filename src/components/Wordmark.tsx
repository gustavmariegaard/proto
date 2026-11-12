import './Wordmark.css';

/**
 * Appens navn: ciircle. To i-er uden prik (ı) med hver sin mint prik.
 * Bruges altid alene, uden ekstra tekst ved siden af.
 */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} role="img" aria-label="ciircle">
      <span aria-hidden="true">c</span>
      <span className="wordmark__i" aria-hidden="true">ı</span>
      <span className="wordmark__i" aria-hidden="true">ı</span>
      <span aria-hidden="true">rcle</span>
    </span>
  );
}
