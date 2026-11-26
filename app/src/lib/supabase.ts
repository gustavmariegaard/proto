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

export const supabase = createClient(url, key, {
  auth: {
    // På web bruges browserens egen lagring; på telefonen AsyncStorage
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
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
