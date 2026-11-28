/* ciircle service worker: viser push-notifikationer og åbner det rigtige sted, når man trykker. */
const BASE = self.registration.scope.replace(/\/$/, ''); // fx https://…/proto/app

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : '' };
  }
  const title = d.title || 'ciircle';
  event.waitUntil(
    (async () => {
      // Er appen åben og synlig på samme side, viser vi ikke en ekstra notifikation
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visible = wins.some((w) => w.visibilityState === 'visible' && d.url && new URL(w.url).pathname.endsWith(d.url));
      if (visible) return;
      await self.registration.showNotification(title, {
        body: d.body || '',
        icon: BASE + '/icon-192.png',
        badge: BASE + '/icon-192.png',
        tag: d.tag || undefined,
        renotify: !!d.tag,
        data: { url: d.url || '/' },
        lang: 'da',
      });
      // Tal på app-ikonet (understøttes på iPhone og nogle Android-browsere)
      if (self.navigator && 'setAppBadge' in self.navigator) self.navigator.setAppBadge().catch(() => {});
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = BASE + (event.notification.data && event.notification.data.url ? event.notification.data.url : '/');
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (w.url.startsWith(BASE)) {
          await w.focus();
          // Appen åbner selv stien (se lib/webPush.ts)
          w.postMessage({ type: 'open', url: event.notification.data.url });
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
