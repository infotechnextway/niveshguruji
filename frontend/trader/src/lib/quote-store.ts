'use client';
import { create } from 'zustand';
import type { Quote } from './types';
import { api } from './api';
import { getDataFeed } from './market/datafeed';

type QuoteStatus = 'idle' | 'connecting' | 'live' | 'snapshot' | 'error';

interface QuoteState {
  quotes: Record<string, Quote>;
  subscribed: Set<string>;
  error: string | null;
  status: QuoteStatus;
  marketOpen: boolean;
  subscribe: (keys: string[]) => void;
}

let listenerAttached = false;
/** Assume closed until /market/status responds — avoids applying after-hours WS ticks. */
let marketOpen = false;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;

function mergeQuote(
  existing: Quote | undefined,
  incoming: Quote,
  fromSnapshot: boolean,
): Quote {
  if (!existing) return incoming;
  if (!marketOpen) {
    // When closed, REST snapshots win; ignore live/simulator WS ticks.
    return fromSnapshot ? incoming : existing;
  }
  if (fromSnapshot && existing.ts > incoming.ts) return existing;
  if (!fromSnapshot && incoming.ts >= existing.ts) return incoming;
  if (fromSnapshot) return incoming;
  return existing;
}

function fetchMarketStatus(): void {
  void api<{ eqOpen: boolean }>('/market/status')
    .then((s) => {
      const wasOpen = marketOpen;
      marketOpen = s.eqOpen;
      useQuotes.setState({ marketOpen: s.eqOpen });
      // Keep chart/datafeed in sync so bars freeze when cash market closes.
      void import('./market/datafeed').then(({ setLiveBarsEnabled }) => {
        setLiveBarsEnabled(s.eqOpen);
      });
      if (wasOpen !== s.eqOpen) {
        ensureSnapshotPolling([...useQuotes.getState().subscribed]);
      }
    })
    .catch(() => undefined);
}

function applySnapshots(
  state: QuoteState,
  map: Record<string, Quote | null>,
): Partial<QuoteState> {
  const merged = { ...state.quotes };
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    const next = mergeQuote(merged[k], v, true);
    if (next !== merged[k]) {
      merged[k] = next;
      changed = true;
    }
  }
  if (!changed) return {};
  return {
    quotes: merged,
    error: null,
    status: marketOpen ? state.status : 'snapshot',
    marketOpen,
  };
}

async function refreshSnapshots(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const q = encodeURIComponent(keys.join(','));
  try {
    const map = await api<Record<string, Quote | null>>(`/market/quotes?keys=${q}`);
    useQuotes.setState((state) => {
      const patch = applySnapshots(state, map);
      return patch.quotes ? { ...state, ...patch } : state;
    });
  } catch {
    // non-fatal — WS may still deliver ticks when market is open
  }
}

function ensureSnapshotPolling(keys: string[]): void {
  if (snapshotTimer) clearInterval(snapshotTimer);
  snapshotTimer = setInterval(() => {
    void refreshSnapshots(keys);
    fetchMarketStatus();
  }, marketOpen ? 120_000 : 30_000);
}

/**
 * Live quote store — engine /ws via UpstoxDataFeed, REST snapshot fallback.
 * When the market is closed, REST last-close snapshots are preferred over WS ticks.
 */
export const useQuotes = create<QuoteState>((set, get) => ({
  quotes: {},
  subscribed: new Set(),
  error: null,
  status: 'idle',
  marketOpen: false,
  subscribe: (keys) => {
    fetchMarketStatus();
    const next = new Set(get().subscribed);
    const fresh: string[] = [];
    for (const k of keys) {
      if (!k) continue;
      if (!next.has(k)) fresh.push(k);
      next.add(k);
    }
    set({ subscribed: next });
    ensureSnapshotPolling([...next]);

    if (!fresh.length && listenerAttached) {
      void refreshSnapshots(keys.filter(Boolean));
      return;
    }

    try {
      const feed = getDataFeed();
      if (!listenerAttached) {
        listenerAttached = true;
        feed.onQuote((q: Quote) => {
          set((state) => {
            const merged = mergeQuote(state.quotes[q.instrumentKey], q, false);
            if (merged === state.quotes[q.instrumentKey]) return state;
            return {
              quotes: { ...state.quotes, [q.instrumentKey]: merged },
              error: null,
              status: marketOpen ? 'live' : 'snapshot',
              marketOpen,
            };
          });
        });
        setInterval(fetchMarketStatus, 60_000);
      }
      if (fresh.length) {
        set({ status: 'connecting' });
        void feed.subscribeQuotes(fresh).catch((err: Error) => {
          set({ error: err.message, status: 'error' });
        });
        void refreshSnapshots(fresh).then(() => {
          set((state) => ({ status: marketOpen ? state.status : 'snapshot' }));
        }).catch((err) => set({ error: (err as Error).message, status: 'error' }));
      }
    } catch (err) {
      set({ error: (err as Error).message, status: 'error' });
    }
  },
}));
