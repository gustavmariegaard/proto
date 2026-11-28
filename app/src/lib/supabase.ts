import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/*
 * Forbindelsen til Supabase (server og database).
 * Adressen og den offentlige nøgle kommer fra .env (se .env.example).
 * Den offentlige nøgle må gerne ligge i appen: reglerne i databasen (RLS) beskytter data.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Mangler EXPO_PUBLIC_SUPABASE_URL og EXPO_PUBLIC_SUPABASE_KEY. Kopiér .env.example til .env.');
}

export const SUPABASE_URL = url;

/** Web: kom man ind via linket i "glemt adgangskode"-mailen? (læses før adressen ryddes) */
export const openedFromRecoveryLink =
  Platform.OS === 'web' && typeof window !== 'undefined' && /(^|[#&?])type=recovery(&|$)/.test(window.location.hash + window.location.search);

/*
 * "Husk mig": huskes man, gemmes login på enheden (man forbliver logget ind, også når appen lukkes).
 * Ellers gemmes det kun, mens appen er åben (web: sessionStorage, telefon: i hukommelsen).
 */
const REMEMBER = 'ciircle.remember';
const memory = new Map<string, string>();
const hasWebStorage = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;
let remember = true;
if (hasWebStorage) {
  try {
    remember = window.localStorage.getItem(REMEMBER) !== '0';
  } catch {}
} else {
  AsyncStorage.getItem(REMEMBER).then((v) => (remember = v !== '0'));
}

/** Vælg, om login skal huskes. Kaldes lige før man logger ind. */
export function setRememberMe(on: boolean) {
  remember = on;
  if (hasWebStorage) {
    try {
      window.localStorage.setItem(REMEMBER, on ? '1' : '0');
    } catch {}
  } else AsyncStorage.setItem(REMEMBER, on ? '1' : '0');
}

export function getRememberMe() {
  return remember;
}

const webStorage = {
  getItem: (k: string) => {
    try {
      return window.localStorage.getItem(k) ?? window.sessionStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      if (remember) {
        window.localStorage.setItem(k, v);
        window.sessionStorage.removeItem(k);
      } else {
        window.sessionStorage.setItem(k, v);
        window.localStorage.removeItem(k);
      }
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k: string) => {
    try {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    } catch {}
    memory.delete(k);
  },
};

const nativeStorage = {
  getItem: async (k: string) => memory.get(k) ?? (await AsyncStorage.getItem(k)),
  setItem: async (k: string, v: string) => {
    if (remember) {
      memory.delete(k);
      await AsyncStorage.setItem(k, v);
    } else {
      memory.set(k, v);
      await AsyncStorage.removeItem(k);
    }
  },
  removeItem: async (k: string) => {
    memory.delete(k);
    await AsyncStorage.removeItem(k);
  },
};

export const supabase = createClient(url, key, {
  auth: {
    storage: Platform.OS === 'web' ? (hasWebStorage ? webStorage : undefined) : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: linket i bekræftelsesmailen logger ind via adressen (#access_token=…)
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Forny login-token, mens appen er i forgrunden (anbefalet af Supabase til React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
