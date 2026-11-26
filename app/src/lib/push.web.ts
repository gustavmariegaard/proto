/*
 * Web: push-notifikationer findes kun i den rigtige app (iPhone/Android).
 * Denne tomme udgave bruges i browseren, så push-koden ikke gør web-appen tungere.
 */
export async function registerForPush(_userId: string): Promise<string | null> {
  return null;
}

export function usePushRegistration() {}
