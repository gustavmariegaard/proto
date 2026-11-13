/*
 * Emner man kan følge i Offentlig debat (Opdag).
 * Ikke i Figma: listen og "Trender lige nu" er eksempeldata til prototypen.
 */

/** Alle emner, man kan søge i */
export const allTopics = [
  'Kultur', 'Byudvikling', 'Skole', 'Musik', 'Cykling', 'Madlavning', 'Fotografi', 'Film', 'Løb', 'Klima',
  'Sport', 'Litteratur', 'Politik', 'Gaming', 'Havearbejde', 'Fodbold', 'Håndbold', 'Kunst',
  'Arkitektur', 'Teater', 'Design', 'Mode', 'Rejser', 'Natur', 'Vandring', 'Svømning', 'Yoga',
  'Sundhed', 'Mental sundhed', 'Forældreskab', 'Skole og uddannelse', 'Teknologi', 'Kunstig intelligens',
  'Videnskab', 'Historie', 'Lokalhistorie', 'Økonomi', 'Iværksætteri', 'Bæredygtighed', 'Genbrug',
  'Dyr', 'Hunde', 'Katte', 'Bagning', 'Vin', 'Kaffe', 'Brætspil', 'Podcasts', 'Frivilligt arbejde',
  'Foreningsliv', 'Boligindretning', 'Bil og trafik', 'Kollektiv trafik', 'Fiskeri', 'Sejlads',
];

/** Det, mange skriver om lige nu (samme aktuelle emner som opslagene i Offentlig debat) */
export const trendingTopics: { name: string; note: string }[] = [
  { name: 'Cykelstier', note: '3.200 opslag i dag' },
  { name: 'Julemarked', note: '1.850 opslag i dag' },
  { name: 'Skolevalg', note: '1.410 opslag i dag' },
  { name: 'Klima', note: '960 opslag i dag' },
  { name: 'Sport', note: '720 opslag i dag' },
];
