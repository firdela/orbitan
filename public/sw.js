/* ── OrbitanOS Service Worker ───────────────────────────────
 * PWA update + offline shell caching.
 *
 * Update flow:
 *   1. New SW installs → caches latest app shell
 *   2. New SW enters "waiting" state (does not activate yet)
 *   3. Client sends { type: 'SKIP_WAITING' } when user taps "Update Now"
 *   4. SW calls self.skipWaiting() → activates immediately
 *   5. Client detects controllerchange → reloads page → new version served
 * ──────────────────────────────────────────────────────────── */

const CACHE_VERSION = 'orbitanos-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: cache the app shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {
        // If any individual asset fails, the SW still installs
        // and will cache assets lazily via fetch handler
      })
    )
  );
});

// ── Activate: clean up old caches + claim clients ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ── Message: allow client to force-activate the waiting SW ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch: network-first for navigation, cache-first for assets ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Navigation requests: try network first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version of the page
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful, same-origin responses
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
