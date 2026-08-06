'use client';
import { useEffect } from 'react';

/** Registers the minimal service worker for PWA installability. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // When a newer service worker takes control (e.g. after a cache-strategy
    // update), reload once so the page runs the fresh bundle instead of a
    // stale cached one. Guarded to avoid reload loops.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {
        /* non-fatal — app still works without SW */
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
