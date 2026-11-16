import { registerSW } from 'virtual:pwa-register';

/**
 * Production-only, post-first-paint service worker registration.
 *
 * Failures are warnings, never boot errors: the app must remain fully usable
 * on unsupported or locked-down browsers. The generated worker precaches the
 * static shell only; /api responses are never cached.
 */

interface ServiceWorkerCallbacks {
  onNeedRefresh: () => void;
  onUpdate: (update: () => Promise<void>) => void;
}

export function registerServiceWorker(callbacks: ServiceWorkerCallbacks): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return () => undefined;

  let cancelled = false;

  const timer = window.setTimeout(() => {
    if (cancelled) return;
    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          if (!cancelled) callbacks.onNeedRefresh();
        },
        onRegisterError: (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.warn('[PWA] Service worker registration failed:', message);
        },
      });
      callbacks.onUpdate(async () => {
        await updateSW(true);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[PWA] Service worker registration failed:', message);
    }
  }, 1500);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}
