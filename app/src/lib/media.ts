import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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

/**
 * Gør billedet mindre før upload: længste side højst maxSide px, JPEG i kvalitet 0,75.
 * Et telefonbillede går fra ca. 1–3 MB til ca. 150–250 KB, så den gratis plan rækker længere.
 */
export async function shrinkImage(uri: string, maxSide = 1080) {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > maxSide) {
    ctx.resize(width >= height ? { width: maxSide } : { height: maxSide });
  }
  const out = await (await ctx.renderAsync()).saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return out.uri;
}

/** Upload til brugerens egen mappe: media/<bruger-id>/<navn>.jpg. avatar = mindre billede. Returnerer stien. */
export async function uploadImage(userId: string, uri: string, _mime = 'image/jpeg', kind: 'opslag' | 'avatar' = 'opslag') {
  const small = await shrinkImage(uri, kind === 'avatar' ? 400 : 1080);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const body = await (await fetch(small)).arrayBuffer();
  const { error } = await supabase.storage.from('media').upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
