const APP_SHELL_CACHE = 'app-shell-v1';
const TILE_CACHE = 'map-tiles-v1';
const TILE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const APP_SHELL_URLS = ['/', '/icons/icon-192x192.png', '/icons/icon-512x512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== APP_SHELL_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls
  if (url.pathname.startsWith('/api/')) return;

  // Map tiles — stale-while-revalidate
  if (url.hostname.includes('openfreemap.org')) {
    event.respondWith(tileStrategy(request));
    return;
  }

  // App shell — cache first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});

async function tileStrategy(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      cache.put(request, clone);
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available, or wait for network
  if (cached) {
    fetchPromise.catch(() => {}); // revalidate in background
    return cached;
  }
  return fetchPromise ?? fetch(request);
}
