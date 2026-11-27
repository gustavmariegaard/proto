import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/*
 * Lille lager på telefonen til det sidst viste indhold (profil, feed), så appen kan vise det
 * med det samme ved næste åbning og opdatere i baggrunden – i stedet for en tom skærm.
 * Web læser synkront (localStorage), så indholdet er der allerede i første billede.
 */
const PREFIX = 'ciircle.cache.';
const mem = new Map<string, unknown>();

export function readCacheSync<T>(key: string): T | undefined {
  if (mem.has(key)) return mem.get(key) as T;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) {
        const v = JSON.parse(raw) as T;
        mem.set(key, v);
        return v;
      }
    } catch {
      /* */
    }
  }
  return undefined;
}

export async function readCache<T>(key: string): Promise<T | undefined> {
  const sync = readCacheSync<T>(key);
  if (sync !== undefined) return sync;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as T;
    mem.set(key, v);
    return v;
  } catch {
    return undefined;
  }
}

export function writeCache(key: string, value: unknown) {
  mem.set(key, value);
  const raw = JSON.stringify(value);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PREFIX + key, raw);
    } catch {
      /* fuld lagring: ikke vigtigt */
    }
  } else {
    AsyncStorage.setItem(PREFIX + key, raw).catch(() => {});
  }
}

/** Ved log ud: glem alt, så den næste bruger på telefonen ikke ser den forriges indhold */
export function clearCache() {
  mem.clear();
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* */
    }
  } else {
    AsyncStorage.getAllKeys()
      .then((keys) => AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX))))
      .catch(() => {});
  }
}
