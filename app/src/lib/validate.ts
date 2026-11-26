/** Brugernavn: 2–30 tegn, små bogstaver, tal, punktum, understreg og æøå */
export const USERNAME = /^[a-z0-9._æøå]{2,30}$/;
export const cleanUsername = (u: string) => u.trim().replace(/^@/, '').toLowerCase();

/** "Anna Marie Nørgaard" → fornavn "Anna Marie", efternavn "Nørgaard" */
export function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: parts[0] ?? '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}
