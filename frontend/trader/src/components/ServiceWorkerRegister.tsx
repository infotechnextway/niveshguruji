'use client';
import { useEffect } from 'react';

/** Registers the minimal service worker for PWA installability. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* non-fatal — app still works without SW */
    });
  }, []);

  return null;
}
