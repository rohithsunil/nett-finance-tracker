self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Nett', body: 'A small nudge from your financial cockpit.' };
  event.waitUntil(self.registration.showNotification(data.title || 'Nett', {
    body: data.body || 'Open Nett for the latest picture.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
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
