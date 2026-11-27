/* TeamLingua service worker r41: network-first / pass-through + web push.
   Exists so the app is installable and can show practice reminders.
   Does not cache HTML/JS/CSS, so new releases are never served from an old cache. */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (self.registration && self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.disable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  event.respondWith(fetch(req));
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {};
    try {
      if (event.data) {
        try { data = event.data.json(); }
        catch (e) { data = { body: event.data.text() }; }
      }
    } catch (e) {}
    const title = (data && data.title) ? String(data.title) : 'TeamLingua';
    const body = (data && data.body) ? String(data.body) : '';
    const url = (data && data.url) ? String(data.url) : './';
    await self.registration.showNotification(title, {
      body: body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      lang: 'zh-CN',
      data: { url: url }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification && event.notification.data && event.notification.data.url) || './';
  let dest = raw;
  try { dest = new URL(raw, self.registration.scope).href; } catch (e) {}
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if (client && typeof client.focus === 'function') {
        try { await client.focus(); } catch (e) {}
        if (typeof client.navigate === 'function') {
          try { await client.navigate(dest); } catch (e) {}
        }
        return;
      }
    }
    if (self.clients && self.clients.openWindow) {
      await self.clients.openWindow(dest);
    }
  })());
});
