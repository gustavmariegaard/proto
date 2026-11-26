import * as ImagePicker from 'expo-image-picker';
import { SUPABASE_URL, supabase } from './supabase';

/*
 * Billeder ligger i en privat "media"-mappe i Supabase. Kun loggede ind kan hente dem,
 * så vi sender login-token med, når et billede vises (expo-image understøtter headers).
 */
let token: string | null = null;
supabase.auth.getSession().then(({ data }) => (token = data.session?.access_token ?? null));
supabase.auth.onAuthStateChange((_e, session) => (token = session?.access_token ?? null));

export function imageSource(path: string | null | undefined) {
  if (!path) return undefined;
  return {
    uri: `${SUPABASE_URL}/storage/v1/object/authenticated/media/${path}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cacheKey: path,
  };
}

/** Vælg et billede fra telefonen. aspect = kvadratisk beskæring (fx profilbillede). */
export async function pickImage(square = false) {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0];
}

/** Upload til brugerens egen mappe: media/<bruger-id>/<navn>. Returnerer stien. */
export async function uploadImage(userId: string, uri: string, mime = 'image/jpeg') {
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from('media').upload(path, body, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}
