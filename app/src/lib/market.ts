import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/*
 * Torvet: kategorier, stand, pris og placering (som i prototypen, src/data/market.ts).
 * Kategorien vælges ikke af sælgeren – den gættes ud fra titel og beskrivelse.
 */

export const categories = ['Møbler', 'Cykler', 'Børn', 'Elektronik', 'Biler', 'Tøj', 'Fritid'] as const;
export type Category = (typeof categories)[number];

export const conditions = ['Ny', 'Som ny', 'God', 'Brugt'] as const;
export type Condition = (typeof conditions)[number];

export const MAX_PHOTOS = 10;
export const MAX_KM = 500;

/** Biler: ord og de mest almindelige mærker */
const CAR =
  /\b(bil|biler|elbil|stationcar|varebil|hybridbil|personbil|polestar|tesla|volvo|vw|volkswagen|toyota|skoda|škoda|audi|bmw|mercedes|ford|peugeot|kia|hyundai|renault|citroën|citroen|opel|nissan|mazda|fiat|seat|cupra|mg|byd|honda|suzuki|dacia|lexus|jaguar|porsche|subaru|mitsubishi|jeep|xpeng|nio|lynk)\b/;

export function guessCategory(text: string): Category {
  const t = text.toLowerCase();
  if (CAR.test(t)) return 'Biler';
  if (/cykel|ladcykel|racer|mtb/.test(t)) return 'Cykler';
  if (/barne|børne|klapvogn|legetøj|autostol|baby/.test(t)) return 'Børn';
  if (/telefon|iphone|computer|tv|højttaler|skærm|kamera|playstation|tablet/.test(t)) return 'Elektronik';
  if (/bord|stol|sofa|seng|skab|reol|lampe|kommode/.test(t)) return 'Møbler';
  if (/\b(jakke|frakke|kjole|bukser|jeans|trøje|sweater|skjorte|t-shirt|nederdel|sko|støvler|sneakers|hættetrøje|habit|blazer)/.test(t)) return 'Tøj';
  return 'Fritid';
}

export function formatPrice(kr: number) {
  if (kr === 0) return 'Gratis';
  return `${kr.toLocaleString('da-DK')} kr.`;
}

export const radiusText = (km: number | null) => (km === null ? 'Hele landet' : `${km} km`);

/** "Lige nu", "for 5 min. siden", "for 2 timer siden", "for 3 dage siden" */
export function listedText(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Lige nu';
  if (min < 60) return `for ${min} min. siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? 'for 1 time siden' : `for ${h} timer siden`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'i går' : `for ${d} dage siden`;
}

export function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export const fmtKm = (km: number) => (km < 1 ? 'Under 1 km væk' : `${Math.round(km)} km væk`);

/** Byer at vælge imellem, hvis man ikke vil dele sin placering (ca. centrum) */
export const cities: { name: string; lat: number; lng: number }[] = [
  { name: 'København', lat: 55.68, lng: 12.57 },
  { name: 'Aarhus', lat: 56.16, lng: 10.2 },
  { name: 'Odense', lat: 55.4, lng: 10.39 },
  { name: 'Aalborg', lat: 57.05, lng: 9.92 },
  { name: 'Esbjerg', lat: 55.48, lng: 8.45 },
  { name: 'Randers', lat: 56.46, lng: 10.04 },
  { name: 'Kolding', lat: 55.49, lng: 9.47 },
  { name: 'Horsens', lat: 55.86, lng: 9.85 },
  { name: 'Vejle', lat: 55.71, lng: 9.54 },
  { name: 'Roskilde', lat: 55.64, lng: 12.08 },
  { name: 'Herning', lat: 56.14, lng: 8.97 },
  { name: 'Silkeborg', lat: 56.17, lng: 9.55 },
  { name: 'Helsingør', lat: 56.03, lng: 12.59 },
  { name: 'Hillerød', lat: 55.93, lng: 12.3 },
  { name: 'Næstved', lat: 55.23, lng: 11.76 },
  { name: 'Fredericia', lat: 55.57, lng: 9.75 },
  { name: 'Viborg', lat: 56.45, lng: 9.4 },
  { name: 'Køge', lat: 55.46, lng: 12.18 },
  { name: 'Holstebro', lat: 56.36, lng: 8.62 },
  { name: 'Slagelse', lat: 55.4, lng: 11.35 },
  { name: 'Sønderborg', lat: 54.91, lng: 9.79 },
  { name: 'Svendborg', lat: 55.06, lng: 10.61 },
  { name: 'Holbæk', lat: 55.72, lng: 11.72 },
  { name: 'Hjørring', lat: 57.46, lng: 9.98 },
  { name: 'Frederikshavn', lat: 57.44, lng: 10.54 },
  { name: 'Skive', lat: 56.57, lng: 9.03 },
  { name: 'Ringsted', lat: 55.44, lng: 11.79 },
  { name: 'Haderslev', lat: 55.25, lng: 9.49 },
  { name: 'Skanderborg', lat: 56.04, lng: 9.93 },
  { name: 'Nykøbing F', lat: 54.77, lng: 11.87 },
  { name: 'Aabenraa', lat: 55.04, lng: 9.42 },
  { name: 'Middelfart', lat: 55.51, lng: 9.73 },
  { name: 'Kalundborg', lat: 55.68, lng: 11.09 },
  { name: 'Nyborg', lat: 55.31, lng: 10.79 },
  { name: 'Thisted', lat: 56.96, lng: 8.69 },
  { name: 'Varde', lat: 55.62, lng: 8.48 },
  { name: 'Ribe', lat: 55.33, lng: 8.76 },
  { name: 'Tønder', lat: 54.93, lng: 8.86 },
  { name: 'Grenaa', lat: 56.42, lng: 10.88 },
  { name: 'Rønne', lat: 55.1, lng: 14.7 },
];

export type MyLocation = { lat: number; lng: number; city: string };

export async function getMyLocation(userId: string): Promise<MyLocation | null> {
  const { data } = await supabase.from('user_locations').select('lat, lng, city').eq('user_id', userId).maybeSingle();
  return (data as MyLocation | null) ?? null;
}

/** Gemmer din placering (afrundes til ca. 1 km i databasen) */
export async function saveMyLocation(userId: string, loc: MyLocation) {
  await supabase.from('user_locations').upsert({ user_id: userId, lat: loc.lat, lng: loc.lng, city: loc.city, updated_at: new Date().toISOString() });
  return { ...loc, lat: Math.round(loc.lat * 100) / 100, lng: Math.round(loc.lng * 100) / 100 };
}

/* ---------- Din placering lige nu (Torvet) ---------- */

/** Telefonens placering huskes et par minutter, så Torvet ikke spørger igen ved hvert skift */
const FRESH_MS = 3 * 60 * 1000;
let live: { loc: MyLocation; at: number } | null = null;
/** By valgt med hånden i denne session (går forud for telefonens placering, indtil man vælger "Brug min placering") */
let chosen: MyLocation | null = null;
/** Sidst valgte by gemmes på telefonen og bruges kun, når placeringen ikke er tilgængelig */
const CITY_KEY = 'ciircle.torvet.by';

export type LocState =
  | { status: 'live'; loc: MyLocation }
  | { status: 'manual'; loc: MyLocation }
  /** Man har sagt nej til placering (eller browseren blokerer den) */
  | { status: 'denied' }
  /** Telefonen kunne ikke finde placeringen */
  | { status: 'unavailable' };

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

async function storedCity(): Promise<MyLocation | null> {
  try {
    const v = await AsyncStorage.getItem(CITY_KEY);
    const c = v ? cities.find((x) => x.name === v) : null;
    return c ? { city: c.name, lat: c.lat, lng: c.lng } : null;
  } catch {
    return null;
  }
}

/**
 * Din placering, der hvor du er nu: telefonens (spørger om lov første gang), ellers den by,
 * du selv har valgt. Aldrig en tilfældig standardby. Placeringen gemmes afrundet (ca. 1 km).
 */
export async function currentLocation(userId: string, opts: { force?: boolean } = {}): Promise<LocState> {
  if (chosen) return { status: 'manual', loc: chosen };
  if (!opts.force && live && Date.now() - live.at < FRESH_MS) return { status: 'live', loc: live.loc };
  let denied = false;
  try {
    const dev = await withTimeout(deviceLocation(), 15000);
    if (dev) {
      live = { loc: dev, at: Date.now() };
      saveMyLocation(userId, dev).catch(() => {});
      return { status: 'live', loc: dev };
    }
    denied = true;
  } catch {
    /* ingen placering (timeout, slået fra, ingen GPS) */
  }
  const city = await storedCity();
  if (city) return { status: 'manual', loc: city };
  return { status: denied ? 'denied' : 'unavailable' };
}

/** Vælg en by med hånden (null = brug telefonens placering igen) */
export async function chooseCity(name: string | null): Promise<MyLocation | null> {
  const c = name ? cities.find((x) => x.name === name) : null;
  chosen = c ? { city: c.name, lat: c.lat, lng: c.lng } : null;
  try {
    if (c) await AsyncStorage.setItem(CITY_KEY, c.name);
  } catch {
    /* ikke vigtigt */
  }
  return chosen;
}

/** Bruges kun som sidste udvej, når en annonce skal have en placering (Sælg) */
export const defaultLocation: MyLocation = { city: 'København', lat: 55.68, lng: 12.57 };

/** Placering til afstande på en annonce: lige nu, ellers den gemte. null, hvis vi ikke kender den. */
export async function knownLocation(userId: string): Promise<MyLocation | null> {
  if (chosen) return chosen;
  if (live && Date.now() - live.at < FRESH_MS) return live.loc;
  const st = await currentLocation(userId);
  if (st.status === 'live' || st.status === 'manual') return st.loc;
  return await getMyLocation(userId);
}

/** Sælg: din placering lige nu, ellers den gemte, ellers en by (kan rettes i feltet "Afhentning") */
export async function locationOrDefault(userId: string): Promise<MyLocation> {
  return (await knownLocation(userId)) ?? defaultLocation;
}

/** Find en by på listen ud fra en tekst ("Afhentning: Aarhus C" → Aarhus) */
export function cityFromText(text: string) {
  const t = text.toLocaleLowerCase('da');
  return cities.find((c) => t.includes(c.name.toLocaleLowerCase('da'))) ?? null;
}

/** Telefonens placering (grov nøjagtighed). null hvis man siger nej. */
export async function deviceLocation(): Promise<MyLocation | null> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  const { latitude: lat, longitude: lng } = pos.coords;
  // Bynavn: fra telefonen, ellers nærmeste by på listen
  let city = '';
  if (Platform.OS !== 'web') {
    try {
      const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      city = a?.city ?? a?.subregion ?? '';
    } catch {
      /* ikke vigtigt */
    }
  }
  if (!city) city = [...cities].sort((x, y) => kmBetween(lat, lng, x.lat, x.lng) - kmBetween(lat, lng, y.lat, y.lng))[0].name;
  return { lat, lng, city };
}

export type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  condition: Condition;
  image_paths: string[];
  city: string;
  shipping: boolean;
  created_at: string;
  distance_km: number | null;
  seller_name: string;
  seller_username: string;
  seller_avatar_path: string | null;
  saved: boolean;
  sold?: boolean;
};

/** Annoncer i nærheden (km = null: hele landet) */
export async function listingsNear(loc: MyLocation, km: number | null) {
  const { data } = await supabase.rpc('listings_near', { lat: loc.lat, lng: loc.lng, km, category: null, before: new Date().toISOString(), max_rows: 120 });
  return (data ?? []) as ListingRow[];
}

/**
 * Søg på Torvet: hele landet, også dine egne annoncer. Bedste match først (titel, kategori,
 * beskrivelse, begyndelsen af ord og små stavefejl), derefter nærmeste.
 */
export async function searchListings(q: string, loc: MyLocation | null) {
  const { data, error } = await supabase.rpc('search_listings', { q, lat: loc?.lat ?? null, lng: loc?.lng ?? null, max_rows: 60 });
  if (error) {
    // Databasen er ikke opdateret endnu: søg i det, vi kan hente (hele landet, uden dine egne)
    const rows = await listingsNear(loc ?? defaultLocation, null);
    return rows.filter((l) => matchesListing(l, q)).map((l) => (loc ? l : { ...l, distance_km: null }));
  }
  return (data ?? []) as ListingRow[];
}

/** Lokal søgning (Dine annoncer, Gemte): store/små bogstaver og accenter er ligegyldige */
const fold = (t: string) => t.toLocaleLowerCase('da').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function matchesListing(l: Pick<ListingRow, 'title' | 'description' | 'category'>, q: string) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  const hay = fold(`${l.title} ${l.description} ${l.category} ${l.category === 'Biler' ? 'bil biler' : ''}`);
  return words.every((w) => hay.includes(w));
}

/** Kategorier, du senest har kigget på */
export async function recentCategories() {
  const { data } = await supabase.rpc('my_recent_listing_categories');
  return ((data ?? []) as { category: Category }[]).map((r) => r.category);
}

/** "Til dig" først: annoncer i de kategorier, du har kigget på (som prototypens relatedFirst) */
export function relatedFirst(all: ListingRow[], recent: Category[]) {
  const rank = (l: ListingRow) => recent.indexOf(l.category);
  const forYou = all.filter((l) => rank(l) >= 0).sort((a, b) => rank(a) - rank(b));
  return { forYou, rest: all.filter((l) => !forYou.includes(l)) };
}

export async function myListings(userId: string) {
  const { data } = await supabase.from('listings').select('*').eq('seller_id', userId).eq('sold', false).order('created_at', { ascending: false });
  return ((data ?? []) as Omit<ListingRow, 'distance_km' | 'seller_name' | 'seller_username' | 'seller_avatar_path' | 'saved'>[]).map(
    (l) => ({ ...l, distance_km: null, seller_name: '', seller_username: '', seller_avatar_path: null, saved: false }) as ListingRow,
  );
}

export async function savedListings(userId: string) {
  const { data } = await supabase
    .from('listing_saves')
    .select('listing_id, listings(*, profiles!listings_seller_id_fkey(name, username, avatar_path))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return ((data ?? []) as any[])
    .filter((r) => r.listings && !r.listings.sold)
    .map((r) => toRow(r.listings, true));
}

function toRow(l: any, saved = false): ListingRow {
  return {
    ...l,
    distance_km: null,
    seller_name: l.profiles?.name ?? '',
    seller_username: l.profiles?.username ?? '',
    seller_avatar_path: l.profiles?.avatar_path ?? null,
    saved,
  };
}

export async function getListing(id: string, userId: string) {
  const { data } = await supabase
    .from('listings')
    .select('*, lat, lng, profiles!listings_seller_id_fkey(name, username, avatar_path, created_at)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const { data: s } = await supabase.from('listing_saves').select('listing_id').eq('listing_id', id).eq('user_id', userId).maybeSingle();
  return { ...toRow(data, !!s), lat: data.lat as number, lng: data.lng as number, seller_since: (data as any).profiles?.created_at as string };
}

export async function markViewed(listingId: string, userId: string) {
  await supabase.from('listing_views').upsert({ user_id: userId, listing_id: listingId, viewed_at: new Date().toISOString() });
}

export async function setListingSaved(listingId: string, userId: string, on: boolean) {
  if (on) await supabase.from('listing_saves').insert({ user_id: userId, listing_id: listingId });
  else await supabase.from('listing_saves').delete().eq('user_id', userId).eq('listing_id', listingId);
}

/**
 * Skriv til sælgeren: find eller start samtalen og send en første besked,
 * der peger på annoncen (vises som kort i samtalen). Returnerer samtalens id.
 */
export async function messageSeller(listing: { id: string; seller_id: string; title: string; price: number }, userId: string, text?: string) {
  const { data: convId, error } = await supabase.rpc('start_conversation', { member_ids: [listing.seller_id] });
  if (error || !convId) throw error ?? new Error('Ingen samtale');
  const body = text?.trim() || `Om: ${listing.title} · ${formatPrice(listing.price)}`;
  await supabase.from('messages').insert({ conversation_id: convId, sender_id: userId, body, listing_id: listing.id });
  return convId as string;
}

/** Kort om en annonce (til samtaler) */
export async function listingSummary(id: string) {
  const { data } = await supabase.from('listings').select('id, title, price, image_paths, sold, seller_id').eq('id', id).maybeSingle();
  return data as { id: string; title: string; price: number; image_paths: string[]; sold: boolean; seller_id: string } | null;
}
