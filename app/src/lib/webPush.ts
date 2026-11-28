import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SUPABASE_URL, supabase } from './supabase';

/*
 * Push i browseren (Web Push). Gratis: browseren leverer selv beskederne.
 * På iPhone virker det kun, når appen er lagt på hjemmeskærmen (Del → Føj til hjemmeskærm), iOS 16.4+.
 */

export type PushState =
  | 'unsupported' // browseren kan ikke push
  | 'needs-install' // iPhone/iPad i Safari: læg appen på hjemmeskærmen først
  | 'denied' // man har sagt nej i browseren
  | 'off' // kan slås til
  | 'on'; // slået til på denne enhed

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

/** Samme sted som appens scripts (fx /proto/app/), så det virker både lokalt og på GitHub Pages */
function base() {
  const script = Array.from(document.scripts).find((s) => s.src.includes('/_expo/'));
  return script ? script.src.slice(0, script.src.indexOf('_expo/')) : `${location.origin}/`;
}

const isIOS = () => isWeb && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const standalone = () => isWeb && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
const supported = () => isWeb && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function registration() {
  return navigator.serviceWorker.register(`${base()}sw.js`, { scope: base() });
}

/** Den offentlige nøgle fra databasen (eller fra Edge Function, som laver den første gang) */
async function publicKey(): Promise<string | null> {
  const { data } = await supabase.rpc('push_public_key');
  if (data) return data as string;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/push`).catch(() => null);
  const json = res && res.ok ? await res.json().catch(() => null) : null;
  return json?.publicKey ?? null;
}

const toBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function save(userId: string, sub: PushSubscription) {
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await supabase.from('web_push_subscriptions').upsert({ endpoint: j.endpoint, user_id: userId, p256dh: j.keys.p256dh, auth: j.keys.auth });
}

export async function pushState(): Promise<PushState> {
  if (!isWeb) return 'unsupported';
  if (!supported()) return isIOS() && !standalone() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration(base());
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Slå push til på denne enhed. Skal kaldes fra et tryk (browseren kræver det). */
export async function enablePush(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!supported()) return { ok: false, error: isIOS() ? 'Læg appen på hjemmeskærmen først.' : 'Din browser understøtter ikke notifikationer.' };
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, error: 'Du har ikke givet lov til notifikationer.' };
    const key = await publicKey();
    if (!key) return { ok: false, error: 'Notifikationer er ikke sat op endnu. Prøv igen senere.' };
    const reg = await registration();
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key) });
    await save(userId, sub);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Notifikationer kunne ikke slås til. Prøv igen.' };
  }
}

export async function disablePush() {
  if (!supported()) return;
  const reg = await navigator.serviceWorker.getRegistration(base());
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('web_push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

/** Status og knapper til skærmene (Indstillinger og kortet under Notifikationer) */
export function usePush(userId: string) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    pushState().then(setState);
  }, []);
  useEffect(refresh, [refresh]);
  const enable = async () => {
    setBusy(true);
    setError('');
    const r = await enablePush(userId);
    if (!r.ok) setError(r.error ?? '');
    setBusy(false);
    refresh();
  };
  const disable = async () => {
    setBusy(true);
    await disablePush();
    setBusy(false);
    refresh();
  };
  return { state, busy, error, enable, disable };
}

/**
 * Når man er logget ind: hold abonnementet frisk (browseren kan skifte det),
 * åbn det rigtige sted, når man trykker på en notifikation, og nulstil tallet på app-ikonet.
 */
export function useWebPushSync(userId: string | undefined) {
  useEffect(() => {
    if (!isWeb || !userId || !supported()) return;
    let alive = true;
    (async () => {
      if (Notification.permission !== 'granted') return;
      const reg = await registration().catch(() => null);
      const sub = await reg?.pushManager.getSubscription();
      if (alive && sub) save(userId, sub);
    })();
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'open' && typeof e.data.url === 'string' && e.data.url.startsWith('/')) router.push(e.data.url as any);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    const clearBadge = () => (navigator as any).clearAppBadge?.().catch?.(() => {});
    clearBadge();
    document.addEventListener('visibilitychange', clearBadge);
    return () => {
      alive = false;
      navigator.serviceWorker.removeEventListener('message', onMsg);
      document.removeEventListener('visibilitychange', clearBadge);
    };
  }, [userId]);
}
