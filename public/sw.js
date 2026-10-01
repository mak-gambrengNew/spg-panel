const CACHE = 'gerai-shell-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/assets/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch (_) { data = { body: event.data?.text() || '' }; }
  const title = data.title || 'PWA Gerai';
  const options = {
    body: data.body || 'Ada pemberitahuan baru.',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.notification_id || `gerai-${Date.now()}`,
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(client => client.url.includes(new URL(target, self.location.origin).pathname));
    if (existing) return existing.focus();
    return clients.openWindow(target);
  }));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API-like requests. Vercel serves hashed assets, so they remain immutable.
  if (url.pathname.startsWith('/api/')) return;

  // Navigation is network-first so a new Vercel deployment becomes visible immediately.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'no-store' }).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put('/index.html', copy)).catch(() => {});
      return response;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(fetch(req, { cache: 'no-store' }).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('/index.html'))));
});
