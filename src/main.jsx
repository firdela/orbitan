import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// ── PWA Service Worker Registration ─────────────────────────
// Registers the service worker for offline caching and instant loads.
// Only active in production (published app), not in dev/preview.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${window.location.origin}/sw.js`;
    navigator.serviceWorker.register(swUrl, { scope: '/' })
      .then((registration) => {
        // Listen for new service worker versions
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version ready — prompt user to refresh
                const shouldRefresh = window.confirm(
                  'A new version of OrbitanOS is ready. Refresh to update?'
                );
                if (shouldRefresh) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[OrbitanOS PWA] Service worker registration failed:', error);
      });
  });
}