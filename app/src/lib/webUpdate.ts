import { Platform } from 'react-native';

/*
 * Web (også appen på hjemmeskærmen): hent den nyeste version af sig selv.
 * Når man vender tilbage til appen (og hvert 10. minut), tjekkes om der er udgivet en ny version.
 * Er der det, genindlæses appen, men kun når man lige er kommet tilbage, så man aldrig mister noget midt i det, man laver.
 */
export function setupAutoUpdate() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const current = Array.from(document.scripts).find((s) => s.src.includes('/_expo/'));
  if (!current) return;
  const base = current.src.slice(0, current.src.indexOf('_expo/'));
  const mine = current.src.slice(current.src.indexOf('_expo/'));
  let pending = false;

  // Genindlæs med en ny adresse, så telefonen ikke giver os den gamle kopi igen. Højst én gang i minuttet.
  const reload = () => {
    try {
      const last = Number(sessionStorage.getItem('ciircle.reloadedAt') || 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem('ciircle.reloadedAt', String(Date.now()));
    } catch {
      /* Uden lager: genindlæs alligevel */
    }
    const url = new URL(location.href);
    url.searchParams.set('v', String(Date.now()));
    location.replace(url.toString());
  };

  const check = async () => {
    try {
      const res = await fetch(`${base}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const html = await res.text();
      const m = html.match(/_expo\/static\/js\/web\/[^"']+\.js/);
      if (m && !mine.startsWith(m[0])) pending = true;
    } catch {
      /* Intet netværk: prøv igen senere */
    }
  };

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    await check();
    if (pending) reload();
  });
  setInterval(check, 10 * 60 * 1000);
  // Første tjek kort efter start: er appen åbnet fra en gammel kopi, hentes den nye med det samme
  setTimeout(async () => {
    await check();
    if (pending) reload();
  }, 3000);
}
