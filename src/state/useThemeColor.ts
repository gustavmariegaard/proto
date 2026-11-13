import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Skærme med mørk baggrund helt ud til kanten */
const DARK = [/^\/flicks(\/|$)/, /^\/moment\//, /^\/profil\/samling\/[^/]+\/vis$/, /^\/opslag\/[^/]+\/del\/moment$/, /^\/bruger\/[^/]+\/samling\//];

const LIGHT_COLOR = '#ffffff';
const DARK_COLOR = '#171717'; // --ink-900

/** Var siden mørk, da den blev indlæst? (sat af det lille script i index.html) */
const loadedDark = document.documentElement.hasAttribute('data-dark');

/**
 * Safari i browseren på iPhone (ikke appen fra hjemmeskærmen) vælger farven
 * på kanterne én gang, når siden indlæses, og ændrer den ikke bagefter.
 * Derfor genindlæser vi siden, når man skifter mellem lyse og mørke skærme.
 */
const isIosSafariTab =
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !(navigator as Navigator & { standalone?: boolean }).standalone &&
  !window.matchMedia('(display-mode: standalone)').matches;

/**
 * Farver statuslinjen, browserens kanter og baggrunden bag appen,
 * så der ikke er en hvid kant rundt om de mørke skærme.
 */
export function useThemeColor() {
  const { pathname } = useLocation();
  const dark = DARK.some((r) => r.test(pathname));
  useEffect(() => {
    if (isIosSafariTab && dark !== loadedDark) {
      window.location.reload();
      return;
    }
    document.documentElement.toggleAttribute('data-dark', dark);
    document.documentElement.style.background = dark ? DARK_COLOR : '';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = dark ? DARK_COLOR : LIGHT_COLOR;
  }, [dark]);
  return dark;
}
