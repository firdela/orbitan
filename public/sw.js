// ============================================================
// OrbitanOS Service Worker — PWA Offline Engine
// Strategy: Stale-While-Revalidate for app shell assets
//          Network-first for navigation (HTML) with cache fallback
//          Network-only for API/backend calls (never cache data)
// ============================================================

const CACHE_VERSION = 'orbitanos-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core app shell assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Assets to never cache (API calls, auth, backend functions)
const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /\/base44\//,
  /\/functions\//,
  /googleapis\.com\/css/,  // fonts load fresh
];

// ── INSTALL: Precache app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Clean old caches, claim clients ────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Routing strategies ────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests that aren't from our CDN
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|ico)$/.test(url.pathname);
  const isBase44Media = url.hostname.includes('media.base44.com');

  // Never cache API/backend calls
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.href))) return;

  // ── Navigation requests: Network-first with HTML cache fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match('/index.html')
          )
        )
    );
    return;
  }

  // ── Static assets & media: Stale-While-Revalidate ──
  if (isSameOrigin && isStaticAsset || isBase44Media) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const cloned = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // ── Default: try cache, fall back to network ──
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        if (response && response.status === 200 && isSameOrigin) {
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => cached)
    )
  );
});

// ── MESSAGE: Allow page to trigger skipWaiting for updates ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
