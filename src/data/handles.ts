/*
 * Brugernavne (@). Laves ud fra det rigtige navn, fx "Mette Lund" → "mette.lund"
 * og "Anna Nørgaard" → "anna.noergaard".
 */
export function handleOf(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

/** Med @ foran */
export const at = (name: string) => `@${handleOf(name)}`;
