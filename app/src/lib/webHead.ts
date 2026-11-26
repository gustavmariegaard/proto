import { Platform } from 'react-native';

/*
 * Web: favicon, ikon til hjemmeskærmen (iPhone/Android) og manifest.
 * Filerne ligger i /public. Stien findes ud fra, hvor appens scripts ligger,
 * så det virker både lokalt og under /proto/app/ på GitHub Pages.
 */
export function setupWebHead() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const script = Array.from(document.scripts).find((s) => s.src.includes('/_expo/'));
  const base = script ? script.src.slice(0, script.src.indexOf('_expo/')) : '/';
  const set = (sel: string, make: () => HTMLElement, attrs: Record<string, string>) => {
    const el = (document.head.querySelector(sel) as HTMLElement | null) ?? document.head.appendChild(make());
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  };
  const link = () => document.createElement('link');
  const meta = () => document.createElement('meta');
  document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((e) => e.remove());
  set('link[rel="icon"][type="image/svg+xml"]', link, { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` });
  set('link[rel="apple-touch-icon"]', link, { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` });
  set('link[rel="manifest"]', link, { rel: 'manifest', href: `${base}manifest.webmanifest` });
  set('meta[name="apple-mobile-web-app-title"]', meta, { name: 'apple-mobile-web-app-title', content: 'ciircle' });
  set('meta[name="apple-mobile-web-app-capable"]', meta, { name: 'apple-mobile-web-app-capable', content: 'yes' });
  set('meta[name="mobile-web-app-capable"]', meta, { name: 'mobile-web-app-capable', content: 'yes' });
  document.title = 'ciircle';
  set('meta[name="theme-color"]', meta, { name: 'theme-color', content: '#fafaf9' });
  // Siden må aldrig kunne rulle sidelæns eller zoome ind på felter
  const style = document.createElement('style');
  // Lys app-baggrund som standard, så browserens top og bund passer (mørke skærme sætter selv deres farve)
  style.textContent = 'html,body{overflow-x:hidden;overscroll-behavior:none;background-color:#fafaf9}';
  document.head.appendChild(style);
  set('meta[name="viewport"]', meta, { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' });
}
