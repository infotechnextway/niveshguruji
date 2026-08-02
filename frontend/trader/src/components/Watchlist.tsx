'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Instrument } from '@/lib/types';
import { price, pct, signClass } from '@/lib/format';
import { useQuotes } from '@/lib/quote-store';
import { api } from '@/lib/api';
import { Icon } from './Icons';

const TABS = [
  { id: 'STOCKS' as const, segment: 'EQ' as const, label: 'Stocks' },
  { id: 'INDICES' as const, segment: 'INDEX' as const, label: 'Indices' },
  { id: 'OPTIONS' as const, segment: 'FO' as const, label: 'Options' },
  { id: 'CURRENCY' as const, segment: 'CUR' as const, label: 'Currency' },
];

const PAGE_SIZE = 100;

type TabId = (typeof TABS)[number]['id'];

export interface WatchlistActions {
  onSelect?: (i: Instrument) => void;
  onBuy?: (i: Instrument) => void;
  onSell?: (i: Instrument) => void;
  onViewChart?: (i: Instrument) => void;
  onOptionChain?: (i: Instrument) => void;
}

/** Watchlist with API tabs, browsable segment list, search, and row actions. */
export function Watchlist({
  selected,
  onSelect,
  onBuy,
  onSell,
  onViewChart,
  onOptionChain,
}: {
  selected?: string;
} & WatchlistActions) {
  const quotes = useQuotes((s) => s.quotes);
  const subscribe = useQuotes((s) => s.subscribe);
  const [tab, setTab] = useState<TabId>('STOCKS');
  const [items, setItems] = useState<Instrument[]>([]);
  const [browse, setBrowse] = useState<Instrument[]>([]);
  const [browseOffset, setBrowseOffset] = useState(0);
  const [browseEnd, setBrowseEnd] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<Instrument[] | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadBrowse = useCallback(async (segment: string, offset: number, append: boolean) => {
    setBrowseLoading(true);
    setError('');
    try {
      const rows = await api<Instrument[]>(`/market/segment/${segment}?limit=${PAGE_SIZE}&offset=${offset}`);
      setBrowseEnd(rows.length < PAGE_SIZE);
      setBrowse((prev) => (append ? [...prev, ...rows] : rows));
      if (rows.length) subscribe(rows.map((i) => i.instrumentKey));
    } catch (err) {
      if (!append) setBrowse([]);
      setError(err instanceof Error ? err.message : 'Failed to load instruments');
    } finally {
      setBrowseLoading(false);
    }
  }, [subscribe]);

  const loadTab = useCallback(async (t: TabId) => {
    setError('');
    try {
      const rows = await api<Array<{ instrumentKey: string; instrument: Instrument | null }>>(`/watchlist/${t}`);
      const instruments = rows.map((r) => r.instrument).filter(Boolean) as Instrument[];
      setItems(instruments);
      if (instruments.length) subscribe(instruments.map((i) => i.instrumentKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist');
      setItems([]);
    }
  }, [subscribe]);

  useEffect(() => { void loadTab(tab); }, [tab, loadTab]);

  useEffect(() => {
    if (query.trim()) return;
    const seg = TABS.find((x) => x.id === tab)!.segment;
    setBrowseOffset(0);
    setBrowseEnd(false);
    void loadBrowse(seg, 0, false);
  }, [tab, query, loadBrowse]);

  const onListScroll = useCallback(() => {
    if (query.trim() || browseLoading || browseEnd) return;
    const el = listRef.current;
    if (!el || el.scrollTop + el.clientHeight < el.scrollHeight - 80) return;
    const seg = TABS.find((x) => x.id === tab)!.segment;
    const next = browseOffset + PAGE_SIZE;
    setBrowseOffset(next);
    void loadBrowse(seg, next, true);
  }, [query, browseLoading, browseEnd, tab, browseOffset, loadBrowse]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setSearchHits(null); return; }
    debounce.current = setTimeout(() => {
      const seg = TABS.find((x) => x.id === tab)?.segment;
      const qs = new URLSearchParams({ q: query.trim(), limit: '40' });
      if (seg) qs.set('segment', seg);
      api<Instrument[]>(`/market/search?${qs}`)
        .then((rows) => {
          setSearchHits(rows);
          subscribe(rows.map((r) => r.instrumentKey));
        })
        .catch(() => setSearchHits([]));
    }, 250);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, tab, subscribe]);

  const shown = searchHits ?? (browse.length ? browse : items);

  async function addToWatchlist(inst: Instrument) {
    try {
      await api(`/watchlist/${tab}`, { method: 'POST', body: JSON.stringify({ instrumentKey: inst.instrumentKey }) });
      setQuery('');
      setSearchHits(null);
      await loadTab(tab);
      onSelect?.(inst);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    }
  }

  return (
    <aside className="wl card" onClick={() => setMenuKey(null)}>
      <div className="wl-search">
        <Icon.Search size={14}/>
        <input
          placeholder="Search full master…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>/</kbd>
      </div>
      <div className="wl-group-head">
        <span>{searchHits ? 'Search' : `${TABS.find((t) => t.id === tab)?.label} · browse`}</span>
        <span className="dim num">{shown.length}{!searchHits && !browseEnd ? '+' : ''}</span>
      </div>
      {error && <div className="wl-err">{error}</div>}
      <div className="wl-list" ref={listRef} onScroll={onListScroll}>
        {shown.map((i) => {
          const q = quotes[i.instrumentKey];
          const cls = q ? signClass(q.change) : '';
          const isSel = selected === i.instrumentKey;
          const menuOpen = menuKey === i.instrumentKey;
          return (
            <div key={i.instrumentKey} className={`wl-row-wrap ${isSel ? 'sel' : ''}`}>
              <button
                type="button"
                className="wl-row"
                onClick={(e) => { e.stopPropagation(); onSelect?.(i); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuKey(i.instrumentKey); }}
              >
                <div className="wl-l">
                  <span className="wl-sym">{i.symbol}</span>
                  <span className="wl-ex">{i.exchange} · {i.segment}</span>
                </div>
                <div className="wl-r">
                  <span className={`wl-chg num ${cls}`}>{q ? `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}` : '—'}</span>
                  <span className={`wl-pct num ${cls}`}>{q ? pct(q.changePct) : '—'}</span>
                  <span className="wl-ltp num">{q ? price(q.ltp) : '—'}</span>
                </div>
              </button>
              <div className="wl-actions">
                <button type="button" className="act buy" onClick={(e) => { e.stopPropagation(); onBuy?.(i); }}>B</button>
                <button type="button" className="act sell" onClick={(e) => { e.stopPropagation(); onSell?.(i); }}>S</button>
                <button type="button" className="act" title="More" onClick={(e) => { e.stopPropagation(); setMenuKey(menuOpen ? null : i.instrumentKey); }}>···</button>
              </div>
              {menuOpen && (
                <div className="wl-menu" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { onViewChart?.(i); setMenuKey(null); }}>View Chart</button>
                  <button type="button" onClick={() => { onBuy?.(i); setMenuKey(null); }}>Buy</button>
                  <button type="button" onClick={() => { onSell?.(i); setMenuKey(null); }}>Sell</button>
                  {(i.segment === 'INDEX' || i.segment === 'EQ' || i.segment === 'FO') && (
                    <button type="button" onClick={() => { onOptionChain?.(i); setMenuKey(null); }}>Option Chain</button>
                  )}
                  <button type="button" onClick={() => { void addToWatchlist(i); setMenuKey(null); }}>Add to watchlist</button>
                </div>
              )}
            </div>
          );
        })}
        {browseLoading && <div className="wl-empty dim">Loading…</div>}
        {!shown.length && !error && !browseLoading && (
          <div className="wl-empty dim">{searchHits ? 'No matches' : 'No instruments — sync master in Admin'}</div>
        )}
      </div>
      <div className="wl-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`wl-tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => { setTab(t.id); setQuery(''); setSearchHits(null); }}
          >
            {t.label.slice(0, 3)}
          </button>
        ))}
      </div>
      <style jsx>{`
        .wl { display: flex; flex-direction: column; min-height: 0; padding: 0; overflow: hidden; }
        .wl-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line-soft); color: var(--text-faint); }
        .wl-search input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 12px; font-family: inherit; }
        .wl-search input::placeholder { color: var(--text-faint); }
        .wl-search kbd { font-size: 10px; padding: 1px 5px; background: var(--panel-2); border-radius: 3px; }
        .wl-group-head { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; background: var(--panel-2); border-bottom: 1px solid var(--line-soft); }
        .wl-err { padding: 8px 12px; font-size: 11px; color: var(--loss); }
        .wl-empty { padding: 16px 12px; font-size: 12px; }
        .wl-list { flex: 1; overflow-y: auto; padding: 4px; }
        .wl-row-wrap { position: relative; border-radius: var(--r-xs); }
        .wl-row-wrap.sel { background: var(--accent-soft); }
        .wl-row-wrap:hover { background: var(--panel-hover); }
        .wl-row { display: flex; align-items: center; width: calc(100% - 72px); padding: 8px 6px 8px 10px; text-align: left; background: transparent; border: none; cursor: pointer; font-family: inherit; color: inherit; }
        .wl-l { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .wl-sym { font-size: 12.5px; font-weight: 500; color: var(--text); }
        .wl-ex { font-size: 9px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; }
        .wl-r { display: flex; align-items: center; gap: 8px; font-size: 11px; }
        .wl-chg { min-width: 46px; text-align: right; }
        .wl-pct { min-width: 44px; text-align: right; opacity: 0.7; }
        .wl-ltp { min-width: 60px; text-align: right; color: var(--text); font-weight: 500; }
        .wl-actions { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); display: flex; gap: 2px; }
        .act { width: 22px; height: 22px; font-size: 10px; font-weight: 600; border-radius: 3px; border: 1px solid var(--line); background: var(--panel); color: var(--text-dim); cursor: pointer; }
        .act.buy { color: var(--gain); }
        .act.sell { color: var(--loss); }
        .wl-menu { position: absolute; right: 8px; top: 100%; z-index: 20; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; box-shadow: var(--shadow-lg); padding: 4px; min-width: 140px; }
        .wl-menu button { display: block; width: 100%; text-align: left; padding: 8px 10px; font-size: 12px; background: transparent; border: none; color: var(--text); border-radius: 4px; cursor: pointer; font-family: inherit; }
        .wl-menu button:hover { background: var(--panel-hover); }
        .wl-tabs { display: flex; padding: 6px 8px; border-top: 1px solid var(--line-soft); background: var(--panel-2); gap: 2px; }
        .wl-tab { flex: 1; padding: 5px; font-size: 11px; color: var(--text-dim); border-radius: 3px; font-weight: 500; background: transparent; border: none; cursor: pointer; font-family: inherit; }
        .wl-tab:hover { color: var(--text); }
        .wl-tab.on { background: var(--panel); color: var(--text); box-shadow: var(--shadow-sm); }
      `}</style>
    </aside>
  );
}
