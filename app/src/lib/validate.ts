/** Brugernavn: 2–30 tegn, små bogstaver, tal, punktum, understreg og æøå */
export const USERNAME = /^[a-z0-9._æøå]{2,30}$/;
export const cleanUsername = (u: string) => u.trim().replace(/^@/, '').toLowerCase();
