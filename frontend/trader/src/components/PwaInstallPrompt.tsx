'use client';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from './Icons';

const IOS_DISMISS_KEY = 'pts_pwa_ios_dismiss';
const ANDROID_DEFER_KEY = 'pts_pwa_android_defer';
const DEFER_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/i.test(ua);
  return isIOS && isSafari;
}

function isDeferred(): boolean {
  try {
    const raw = localStorage.getItem(ANDROID_DEFER_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

/** Non-blocking install guide — iOS Safari sheet or Android beforeinstallprompt banner. */
export function PwaInstallPrompt() {
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    if (isIosSafari()) {
      try {
        if (localStorage.getItem(IOS_DISMISS_KEY) === '1') return;
      } catch { /* ignore */ }
      const t = window.setTimeout(() => setIosOpen(true), 1200);
      return () => window.clearTimeout(t);
    }

    if (isDeferred()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setAndroidOpen(true);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const dismissIos = useCallback(() => {
    try { localStorage.setItem(IOS_DISMISS_KEY, '1'); } catch { /* ignore */ }
    setIosOpen(false);
  }, []);

  const deferAndroid = useCallback(() => {
    try { localStorage.setItem(ANDROID_DEFER_KEY, String(Date.now() + DEFER_MS)); } catch { /* ignore */ }
    setAndroidOpen(false);
    setDeferredPrompt(null);
  }, []);

  const dismissAndroidForever = useCallback(() => {
    try { localStorage.setItem(ANDROID_DEFER_KEY, String(Date.now() + 3650 * 24 * 60 * 60 * 1000)); } catch { /* ignore */ }
    setAndroidOpen(false);
    setDeferredPrompt(null);
  }, []);

  const installAndroid = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setAndroidOpen(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (isStandalone() || (!iosOpen && !androidOpen)) return null;

  if (iosOpen) {
    return (
      <div className="pwa-toast pwa-toast--ios" role="region" aria-label="Install app">
        <div className="pwa-toast__body">
          <div className="pwa-toast__icon" aria-hidden>
            <Icon.DashboardFilled size={22} />
          </div>
          <div className="pwa-toast__text">
            <strong>Install Nivesh Guru</strong>
            <span>
              Tap <em>Share</em> <span className="pwa-toast__share-icon" aria-hidden>⎙</span> then{' '}
              <em>Add to Home Screen</em> for quick access.
            </span>
          </div>
        </div>
        <div className="pwa-toast__actions">
          <button type="button" className="pwa-toast__btn pwa-toast__btn--primary" onClick={dismissIos}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-toast pwa-toast--android" role="region" aria-label="Install app">
      <div className="pwa-toast__body">
        <div className="pwa-toast__icon" aria-hidden>
          <Icon.DashboardFilled size={22} />
        </div>
        <div className="pwa-toast__text">
          <strong>Install app</strong>
          <span>Add Nivesh Guru to your home screen for a native-like experience.</span>
        </div>
      </div>
      <div className="pwa-toast__actions">
        <button type="button" className="pwa-toast__btn pwa-toast__btn--ghost" onClick={deferAndroid}>
          Not now
        </button>
        <button type="button" className="pwa-toast__btn pwa-toast__btn--primary" onClick={installAndroid}>
          Install
        </button>
        <button type="button" className="pwa-toast__btn pwa-toast__btn--link" onClick={dismissAndroidForever}>
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
