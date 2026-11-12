import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Skærme med mørk baggrund helt ud til kanten */
const DARK = [/^\/flicks(\/|$)/, /^\/moment\//, /^\/profil\/samling\/[^/]+\/vis$/];

const LIGHT_COLOR = '#ffffff';
const DARK_COLOR = '#171717'; // --ink-900

/**
 * Farver statuslinjen, browserens kanter og baggrunden bag appen,
 * så der ikke er en hvid kant rundt om de mørke skærme.
 */
export function useThemeColor() {
  const { pathname } = useLocation();
  useEffect(() => {
    const dark = DARK.some((r) => r.test(pathname));
    document.documentElement.toggleAttribute('data-dark', dark);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = dark ? DARK_COLOR : LIGHT_COLOR;
  }, [pathname]);
}
