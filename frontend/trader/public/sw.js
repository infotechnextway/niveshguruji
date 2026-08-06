// Bumped cache name so the activate handler purges the old cache-first
// ("ridgeline-shell-v1") caches that could pin a stale app bundle.
const CACHE = 'ridgeline-shell-v2';
const SHELL = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// Network-first so the browser never serves a stale HTML shell / JS bundle
// (which previously pinned old code and broke live data). Falls back to cache
// only when the network is unavailable, preserving basic offline support.
// API and WebSocket traffic is never cached.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok && (request.mode === 'navigate' || SHELL.includes(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request)),
  );
});
