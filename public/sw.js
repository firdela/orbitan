/* ============================================================
 * OrbitanOS — Service Worker (Build #28.2C)
 *
 * PWA cache strategy:
 *   - App shell (HTML/JS/CSS): stale-while-revalidate with
 *     immediate update-on-revision via SKIP_WAITING.
 *   - OAuth callback routes: NEVER cached. Query params (code,
 *     state, error, error_description) must always reach the app.
 *   - API/auth/integration responses: NEVER cached.
 *   - Static assets (images, fonts): cache-first with revalidation.
 *
 * A version bump in CACHE_NAME forces all previous caches to be
 * purged on install, guaranteeing no stale OAuth implementation
 * persists after a new deployment.
 * ============================================================ */

const CACHE_NAME = 'orbitan-os-v28-2c-20260802';

// Routes that must NEVER be served from cache — they carry OAuth
// callback params or hit live API/auth endpoints.
const NEVER_CACHE_PATTERNS = [
  /\/platform\/integrations/,    // OAuth callback route
  /\/api\//,                      // Base44 API + backend functions
  /\/auth\//,                     // Auth endpoints
  /[?&](code|state|error|error_description)=/, // OAuth callback params anywhere
];

// Static asset extensions — cache-first is safe for these.
const STATIC_ASSET_PATTERN = /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|css)$/;

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW takes control immediately on install.
  // This guarantees the new app shell replaces the old one without
  // requiring the user to close all tabs.
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((keys) => {
      // Purge all old caches from previous versions.
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean remaining stale caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // Take control of all open clients immediately
      self.clients.claim(),
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests — all other methods pass through.
  if (request.method !== 'GET') return;

  // ── Never cache: OAuth callbacks, API calls, auth endpoints ──
  const shouldNeverCache = NEVER_CACHE_PATTERNS.some((pattern) =>
    pattern.test(url.pathname + url.search)
  );

  if (shouldNeverCache) {
    // Pass directly to network — no cache read, no cache write.
    event.respondWith(fetch(request));
    return;
  }

  // ── Static assets: cache-first with background revalidation ──
  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // ── Navigation requests (HTML app shell): network-first ──
  // Falls back to cached shell only if network fails (offline).
  // This ensures the latest app version is always served, and
  // the OAuth callback route always loads fresh.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest index.html for offline fallback
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback — serve cached shell
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // ── Default: try network, fall back to cache ──
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
