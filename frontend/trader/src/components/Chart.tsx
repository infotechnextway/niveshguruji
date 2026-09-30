'use client';
import { useEffect, useRef, useCallback } from 'react';
import type { Instrument } from '@/lib/types';
import { useTheme } from '@/lib/theme';
import { getTVDatafeed } from '@/lib/market/tv-datafeed';

/* ------------------------------------------------------------------ */
/*  TradingView widget type shims (loaded from /charting_library/)      */
/* ------------------------------------------------------------------ */

type ResolutionString = string;

interface TVWidget {
  setSymbol(symbol: string, interval: ResolutionString, callback: () => void): void;
  chart(): {
    setSymbol(symbol: string, interval: ResolutionString, callback: () => void): void;
  };
  changeTheme(theme: 'Light' | 'Dark'): Promise<void>;
  remove(): void;
  onChartReady(callback: () => void): void;
  subscribe(event: string, callback: () => void): void;
}

interface TVWidgetOptions {
  container: HTMLElement | string;
  datafeed: unknown;
  interval: ResolutionString;
  symbol: string;
  library_path: string;
  locale: string;
  autosize: boolean;
  theme: 'Light' | 'Dark';
  timezone: string;
  disabled_features: string[];
  enabled_features: string[];
  fullscreen: boolean;
  debug: boolean;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: TVWidgetOptions) => TVWidget;
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Script loader                                                      */
/* ------------------------------------------------------------------ */

let scriptPromise: Promise<void> | null = null;

function loadTVScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (typeof window === 'undefined') {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }
  if (window.TradingView?.widget) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/charting_library/charting_library.standalone.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load TradingView charting library'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/* ------------------------------------------------------------------ */
/*  Resolution mapping for the default interval                         */
/* ------------------------------------------------------------------ */

function defaultInterval(): ResolutionString {
  return '1' as ResolutionString;
}

/* ------------------------------------------------------------------ */
/*  Chart component                                                     */
/* ------------------------------------------------------------------ */

/** TradingView Advanced Chart for the watchlist. */
export function Chart({ inst }: { inst: Instrument }) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TVWidget | null>(null);
  const themeRef = useRef(theme);

  // Track theme changes.
  themeRef.current = theme;

  // Apply theme to existing widget.
  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    const tvTheme = theme === 'dark' ? 'Dark' : 'Light';
    widget.changeTheme(tvTheme).catch(() => { /* ignore */ });
  }, [theme]);

  // Create widget once the script is loaded.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let widget: TVWidget | null = null;

    const init = async () => {
      try {
        await loadTVScript();
      } catch {
        return;
      }
      if (cancelled || !window.TradingView?.widget || !containerRef.current) return;

      const tvTheme = themeRef.current === 'dark' ? 'Dark' : 'Light';
      const symbol = encodeURIComponent(inst.instrumentKey);

      widget = new window.TradingView.widget({
        container: containerRef.current,
        datafeed: getTVDatafeed(),
        interval: defaultInterval(),
        symbol,
        library_path: '/charting_library/',
        locale: 'en',
        autosize: true,
        theme: tvTheme,
        timezone: 'Asia/Kolkata',
        fullscreen: false,
        debug: false,
        disabled_features: [
          'use_localstorage_for_settings',
          'header_saveload',
          'volume_force_overlay',
          'display_market_status',
          'popup_dialog',
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode',
          'header_in_fullscreen_mode',
        ],
      });

      widgetRef.current = widget;
    };

    void init();

    return () => {
      cancelled = true;
      if (widget) {
        try { widget.remove(); } catch { /* ignore */ }
      }
      widgetRef.current = null;
    };
    // Only recreate on mount — symbol changes handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update symbol when instrument changes (after initial mount).
  const prevInstKey = useRef(inst.instrumentKey);
  const handleSymbolChange = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget || prevInstKey.current === inst.instrumentKey) return;
    prevInstKey.current = inst.instrumentKey;
    const symbol = encodeURIComponent(inst.instrumentKey);
    try {
      widget.chart().setSymbol(symbol, defaultInterval(), () => { /* done */ });
    } catch {
      // If setSymbol fails, we can try the widget-level method.
      try {
        widget.setSymbol(symbol, defaultInterval(), () => { /* done */ });
      } catch { /* ignore */ }
    }
  }, [inst.instrumentKey]);

  useEffect(() => {
    handleSymbolChange();
  }, [handleSymbolChange]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 280 }}
    />
  );
}
