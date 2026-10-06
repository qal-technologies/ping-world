/* App notification worker. Push payloads must never contain sensitive quiz answers. */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data ? event.data.text() : '' }; }
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'Ping World';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 500) : 'You have a new notification.';
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') && !payload.url.startsWith('//') ? payload.url : '/';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 100) : 'pingworld-notification',
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && typeof event.notification.data.url === 'string' ? event.notification.data.url : '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    return existing ? existing.navigate(url).then(() => existing.focus()) : self.clients.openWindow(url);
  }));
});
