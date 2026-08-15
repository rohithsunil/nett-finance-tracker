const CACHE_NAME = 'nett-shell-v1.13.0';
const APP_SHELL = ['/', '/login?mode=signup', '/changelog', '/manifest.webmanifest', '/icons/nett-lotus-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && (event.request.mode === 'navigate' || event.request.destination === 'script' || event.request.destination === 'style')) {
      const copy = response.clone(); void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nett', body: 'A small nudge from your financial cockpit.' };
  event.waitUntil(self.registration.showNotification(data.title || 'Nett', {
    body: data.body || 'Open Nett for the latest picture.',
    icon: '/icons/nett-lotus-192.png',
    badge: '/icons/nett-lotus-192.png',
    tag: data.tag || 'nett-reminder',
    data: { url: data.url || '/' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    const target = event.notification.data?.url || '/';
    for (const client of windowClients) { if ('focus' in client) { client.navigate(target); return client.focus(); } }
    return clients.openWindow(target);
  }));
});
