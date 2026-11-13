/*
 * Husker små lagre i denne fane (sessionStorage), så intet går tabt,
 * hvis siden genindlæses – fx når Safari skifter mellem lyse og mørke skærme.
 * Lukker man fanen, starter man forfra.
 */
export function keep<T>(key: string, initial: T): T {
  try {
    const raw = sessionStorage.getItem(`ciircle.${key}`);
    return raw ? (JSON.parse(raw) as T) : initial;
  } catch {
    return initial;
  }
}

export function save(key: string, value: unknown) {
  try {
    sessionStorage.setItem(`ciircle.${key}`, JSON.stringify(value));
  } catch {
    /* ikke vigtigt */
  }
}
