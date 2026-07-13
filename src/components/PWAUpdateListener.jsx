import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

/**
 * PWAUpdateListener
 * Registers the service worker and shows a non-blocking toast
 * when a new version of OrbitanOS is deployed. The user can
 * click "Update Now" to activate the new version instantly,
 * or the update will apply on the next natural page reload.
 *
 * Also checks for updates when the tab becomes visible,
 * so users who keep OrbitanOS open all day still get notified.
 */
export default function PWAUpdateListener() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In dev mode, the service worker can cache-serve stale React/Vite chunks,
    // causing "null is not an object (evaluating 'dispatcher.useState')" due to
    // React/ReactDOM version mismatch. Prevent registration and purge stale caches.
    if (import.meta.env.DEV) {
      const purgeDevCaches = async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch (e) {
          // Silent — dev-only cleanup
        }
      };
      purgeDevCaches();
      return;
    }

    let refreshing = false;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Only show the toast if there's already an active controller
            // (i.e. this is an UPDATE, not the first install)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast({
                title: 'Update Available',
                description: 'A new version of OrbitanOS is ready to install.',
                action: (
                  <ToastAction
                    altText="Update Now"
                    onClick={() => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }}
                    className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  >
                    Update Now
                  </ToastAction>
                ),
              });
            }
          });
        });
      } catch (error) {
        console.warn('[OrbitanOS PWA] Service worker registration failed:', error);
      }
    };

    registerSW();

    // When the new SW takes control (after SKIP_WAITING), reload once
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Check for updates when the user returns to the tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.update();
        });
      }
    });
  }, []);

  return null;
}