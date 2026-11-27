import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { SUPABASE_URL, supabase } from './supabase';

/*
 * Billeder ligger i en privat "media"-mappe i Supabase. Kun loggede ind kan hente dem.
 *
 * Telefon: login-token sendes med som header, og expo-image gemmer billedet på telefonen.
 * Web: et billede hentet med header kan browseren ikke gemme, så det hentes forfra hver gang
 * (langsomt og blinkende). Derfor får hvert billede en tidsbegrænset adresse (signeret URL, 24 t),
 * som huskes i browseren. Samme adresse næste gang = browseren viser billedet med det samme.
 * Adresserne laves samlet i små portioner og kun til loggede ind brugere.
 */
let token: string | null = null;
supabase.auth.getSession().then(({ data }) => (token = data.session?.access_token ?? null));
supabase.auth.onAuthStateChange((_e, session) => {
  token = session?.access_token ?? null;
  if (!session) clearSigned();
});

const isWeb = Platform.OS === 'web';
const SIGN_SECONDS = 24 * 3600;
const STORE_KEY = 'ciircle.signed-media';
type Signed = Record<string, { url: string; exp: number }>;

let signed: Signed = {};
if (isWeb) {
  try {
    signed = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    signed = {};
  }
}
const saveSigned = () => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(signed));
  } catch {
    /* fuld lagring: ikke vigtigt */
  }
};
function clearSigned() {
  signed = {};
  if (isWeb) {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* */
    }
  }
}

// Saml forespørgsler og signér dem i én omgang lidt efter
const queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
function requestSign(path: string) {
  queue.add(path);
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const paths = [...queue];
    queue.clear();
    if (!token || !paths.length) return;
    const { data } = await supabase.storage.from('media').createSignedUrls(paths, SIGN_SECONDS);
    const exp = Date.now() + (SIGN_SECONDS - 3600) * 1000; // forny en time før udløb
    for (const d of data ?? []) if (d.signedUrl && d.path) signed[d.path] = { url: d.signedUrl, exp };
    saveSigned();
    listeners.forEach((l) => l());
  }, 30);
}

/** Kaldes af skærme, der vil tegne igen, når nye billedadresser er klar (web) */
export function onSignedMedia(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function imageSource(path: string | null | undefined) {
  if (!path) return undefined;
  if (isWeb) {
    const hit = signed[path];
    if (hit && hit.exp > Date.now()) return { uri: hit.url, cacheKey: path };
    requestSign(path);
  }
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

/** Upload af video (flicks og moments). Telefonen komprimerer selv videoen ved valg. Returnerer stien. */
export async function uploadVideo(userId: string, uri: string, mime = 'video/mp4') {
  const ext = mime.includes('quicktime') ? 'mov' : mime.includes('webm') ? 'webm' : 'mp4';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from('media').upload(path, body, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}

/** Vælg billede eller video (moments og flicks) */
export async function pickMedia(allowVideo = true) {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: allowVideo ? ['images', 'videos'] : ['images'],
    quality: 0.8,
    videoMaxDuration: 60,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0];
}
