/** "Lige nu", "5 min.", "2 t.", "3 d.", ellers dato – som i prototypen */
export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Lige nu';
  if (s < 3600) return `${Math.floor(s / 60)} min.`;
  if (s < 86400) return `${Math.floor(s / 3600)} t.`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d.`;
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

/** Minutter siden (til sortering af kommentarer) */
export const ageMinutes = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60000;

export const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} t.` : String(n));
export const fmtNumber = (n: number) => n.toLocaleString('da-DK');
