'use client';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Chart } from '@/components/Chart';
import { OptionChain } from '@/components/OptionChain';
import { OrderModal } from '@/components/trading/OrderModal';
import { TradeToast } from '@/components/trading/TradeToast';
import { Icon } from '@/components/Icons';
import { api, ApiError } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { price, pct, signClass } from '@/lib/format';
import { useQuotes } from '@/lib/quote-store';
import type { Instrument, Side } from '@/lib/types';

type WlTab = { tab: string; name: string; count: number };
type WlItem = { instrumentKey: string; sort: number; instrument: Instrument | null };
type CenterView = 'chart' | 'chain';
type MobileView = 'list' | 'detail';

const LOCAL_WL = 'pts_local_watchlists';
const FALLBACK: Instrument = {
  instrumentKey: 'NSE_INDEX|Nifty 50',
  symbol: 'NIFTY 50',
  name: 'Nifty 50',
  exchange: 'NSE',
  segment: 'INDEX',
  lotSize: 1,
};

const DEFAULT_TABS: WlTab[] = [
  { tab: 'MY', name: 'My Watchlist', count: 0 },
  { tab: 'STOCKS', name: 'Stocks', count: 0 },
  { tab: 'INDICES', name: 'Indices', count: 0 },
  { tab: 'OPTIONS', name: 'Options', count: 0 },
  { tab: 'CURRENCY', name: 'Currency', count: 0 },
];

const TAB_SEGMENT: Record<string, string | undefined> = {
  STOCKS: 'EQ',
  INDICES: 'INDEX',
  OPTIONS: 'FO',
  CURRENCY: 'CUR',
};

const MY_WATCHLIST_NAME = 'My Watchlist';

function isCatalogTab(tab: string): boolean {
  return Boolean(TAB_SEGMENT[tab]);
}

function isPersonalTab(tab: string): boolean {
  return !isCatalogTab(tab);
}

/** Prefer "My Watchlist", else first custom list, ahead of catalog tabs. */
function orderTabs(rows: WlTab[]): WlTab[] {
  const catalog = DEFAULT_TABS.filter((t) => isCatalogTab(t.tab)).map((def) => {
    const hit = rows.find((r) => r.tab === def.tab);
    return hit ?? def;
  });
  const personal = rows.filter((r) => isPersonalTab(r.tab));
  personal.sort((a, b) => {
    if (a.name === MY_WATCHLIST_NAME) return -1;
    if (b.name === MY_WATCHLIST_NAME) return 1;
    return a.tab.localeCompare(b.tab);
  });
  return [...personal, ...catalog];
}

const BROWSE_PAGE = 100;

function readLocal(): Record<string, Instrument[]> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_WL) || '{}') as Record<string, Instrument[]>;
  } catch { return {}; }
}
function writeLocal(map: Record<string, Instrument[]>) {
  try { localStorage.setItem(LOCAL_WL, JSON.stringify(map)); } catch { /* ignore */ }
}

function WatchlistInner() {
  const searchParams = useSearchParams();
  const [tabs, setTabs] = useState<WlTab[]>(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState('MY');
  const [items, setItems] = useState<WlItem[]>([]);
  const [selected, setSelected] = useState<Instrument>(FALLBACK);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [centerView, setCenterView] = useState<CenterView>('chart');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [pulseKey, setPulseKey] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<Side>('BUY');
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [creating, setCreating] = useState(false);
  const [apiOk, setApiOk] = useState(true);
  const [userName, setUserName] = useState('Trader');
  const [browse, setBrowse] = useState<Instrument[]>([]);
  const [browseOffset, setBrowseOffset] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseEnd, setBrowseEnd] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [isMobile, setIsMobile] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const defaultedTab = useRef(false);
  const quotes = useQuotes((s) => s.quotes);
  const subscribe = useQuotes((s) => s.subscribe);

  useEffect(() => {
    const s = getSession();
    if (s?.user?.name) setUserName(s.user.name);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => {
      setIsMobile(mq.matches);
      setMobileView('list');
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (mobileView === 'list' && isMobile && listRef.current) {
      listRef.current.scrollTop = listScrollRef.current;
    }
  }, [mobileView, isMobile]);

  useEffect(() => {
    if (searchParams.get('view') === 'chain') setCenterView('chain');
    const u = searchParams.get('u');
    if (u) {
      setSelected((prev) => (
        prev.instrumentKey === u ? prev : {
          ...FALLBACK,
          instrumentKey: u,
          symbol: u.includes('|') ? u.split('|')[1] : u,
          name: u,
        }
      ));
      setCenterView('chain');
      setMobileView('detail');
    }
  }, [searchParams]);

  const selectInstrument = useCallback((inst: Instrument, view: CenterView = 'chart') => {
    setSelected(inst);
    setCenterView(view);
    setExpanded(null);
    if (isMobile) {
      if (listRef.current) listScrollRef.current = listRef.current.scrollTop;
      setMobileView('detail');
    }
  }, [isMobile]);

  const goBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  const chainUnderlying = useMemo(
    () => selected.underlyingKey || selected.instrumentKey,
    [selected],
  );

  const loadFromLocal = useCallback((tab: string) => {
    const map = readLocal();
    const list = map[tab] ?? [];
    setItems(list.map((inst, i) => ({ instrumentKey: inst.instrumentKey, sort: i, instrument: inst })));
    setStarred(new Set(list.map((i) => i.instrumentKey)));
    if (list.length && isPersonalTab(tab)) {
      subscribe(list.map((i) => i.instrumentKey));
      setSelected((prev) => list.find((i) => i.instrumentKey === prev.instrumentKey) ?? list[0]);
    }
    if (isPersonalTab(tab)) {
      setTabs((prev) => prev.map((t) => (
        isPersonalTab(t.tab) ? { ...t, count: (map[t.tab] ?? []).length } : t
      )));
    }
  }, [subscribe]);

  const ensureMyWatchlistLocal = useCallback((): WlTab[] => {
    const map = readLocal();
    if (!map.MY) {
      map.MY = [];
      writeLocal(map);
    }
    const personal = Object.keys(map)
      .filter((k) => isPersonalTab(k))
      .map((tab) => ({
        tab,
        name: tab === 'MY' ? MY_WATCHLIST_NAME : tab,
        count: (map[tab] ?? []).length,
      }));
    return orderTabs([...personal, ...DEFAULT_TABS.filter((t) => isCatalogTab(t.tab))]);
  }, []);

  const loadTabs = useCallback(async () => {
    try {
      let rows = await api<WlTab[]>('/watchlist');
      const hasPersonal = rows.some((r) => isPersonalTab(r.tab));
      if (!hasPersonal) {
        try {
          const created = await api<{ tab: string; name: string }>('/watchlist', {
            method: 'POST',
            body: JSON.stringify({ name: MY_WATCHLIST_NAME }),
          });
          rows = [...rows, { tab: created.tab, name: created.name, count: 0 }];
        } catch { /* ignore — user may lack permission briefly */ }
      }
      const ordered = orderTabs(rows.length ? rows : DEFAULT_TABS);
      setTabs(ordered);
      setApiOk(true);
      const stocksCount = ordered.find((t) => t.tab === 'STOCKS')?.count ?? 0;
      if (stocksCount > 0 && stocksCount < 50) {
        setHint(
          `Only ${stocksCount} stocks in catalog (starter seed). On the server run: cd backend && MONGO_URI=… npm run sync:instruments — or Admin → Instruments → Sync.`,
        );
      } else {
        setHint('');
      }
      if (!defaultedTab.current) {
        defaultedTab.current = true;
        const firstPersonal = ordered.find((t) => isPersonalTab(t.tab));
        if (firstPersonal) setActiveTab(firstPersonal.tab);
      }
    } catch (err) {
      setApiOk(false);
      setHint(err instanceof ApiError ? err.message : 'Watchlist API unavailable — using local lists');
      const localTabs = ensureMyWatchlistLocal();
      setTabs(localTabs);
      if (!defaultedTab.current) {
        defaultedTab.current = true;
        setActiveTab('MY');
      }
      loadFromLocal('MY');
    }
  }, [ensureMyWatchlistLocal, loadFromLocal]);

  const loadItems = useCallback(async (tab: string) => {
    if (isCatalogTab(tab)) return;
    try {
      const rows = await api<WlItem[]>(`/watchlist/${tab}`);
      setItems(rows);
      setStarred(new Set(rows.map((r) => r.instrumentKey)));
      const instruments = rows.map((r) => r.instrument).filter(Boolean) as Instrument[];
      if (instruments.length) {
        subscribe(instruments.map((i) => i.instrumentKey));
        setSelected((prev) => instruments.find((i) => i.instrumentKey === prev.instrumentKey) ?? instruments[0]);
      }
      setApiOk(true);
    } catch {
      setApiOk(false);
      loadFromLocal(tab);
    }
  }, [loadFromLocal, subscribe]);

  /** Load star state for catalog tabs from the primary personal list. */
  const refreshStarredFromSaveTab = useCallback(async (saveTab: string) => {
    try {
      const rows = await api<WlItem[]>(`/watchlist/${saveTab}`);
      setStarred(new Set(rows.map((r) => r.instrumentKey)));
    } catch {
      const map = readLocal();
      setStarred(new Set((map[saveTab] ?? []).map((i) => i.instrumentKey)));
    }
  }, []);

  useEffect(() => { void loadTabs(); }, [loadTabs]);
  useEffect(() => {
    if (isPersonalTab(activeTab)) {
      void loadItems(activeTab);
      return;
    }
    const saveTab = tabs.find((t) => isPersonalTab(t.tab))?.tab;
    if (saveTab) void refreshStarredFromSaveTab(saveTab);
  }, [activeTab, loadItems, refreshStarredFromSaveTab, tabs]);

  const loadBrowse = useCallback(async (seg: string, offset: number, append: boolean) => {
    setBrowseLoading(true);
    try {
      const rows = await api<Instrument[]>(`/market/segment/${seg}?limit=${BROWSE_PAGE}&offset=${offset}`);
      setBrowseEnd(rows.length < BROWSE_PAGE);
      setBrowse((prev) => (append ? [...prev, ...rows] : rows));
      if (rows.length) subscribe(rows.map((r) => r.instrumentKey));
      if (!append && rows.length) {
        setSelected((prev) => (
          rows.some((r) => r.instrumentKey === prev.instrumentKey) ? prev : rows[0]
        ));
      }
    } catch (err) {
      if (!append) setBrowse([]);
      setHint(err instanceof Error ? err.message : 'Could not load instruments');
    } finally {
      setBrowseLoading(false);
    }
  }, [subscribe]);

  useEffect(() => {
    if (query.trim()) return;
    const seg = TAB_SEGMENT[activeTab];
    if (!seg) {
      setBrowse([]);
      return;
    }
    setBrowseOffset(0);
    setBrowseEnd(false);
    void loadBrowse(seg, 0, false);
  }, [activeTab, query, loadBrowse]);

  const onListScroll = useCallback(() => {
    if (query.trim() || browseLoading || browseEnd) return;
    const seg = TAB_SEGMENT[activeTab];
    if (!seg) return;
    const el = listRef.current;
    if (!el || el.scrollTop + el.clientHeight < el.scrollHeight - 80) return;
    const next = browseOffset + BROWSE_PAGE;
    setBrowseOffset(next);
    void loadBrowse(seg, next, true);
  }, [query, browseLoading, browseEnd, activeTab, browseOffset, loadBrowse]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(() => {
      setSearching(true);
      const qs = new URLSearchParams({ q: query.trim(), limit: '40' });
      const seg = TAB_SEGMENT[activeTab];
      if (seg) qs.set('segment', seg);
      api<Instrument[]>(`/market/search?${qs}`)
        .then((rows) => {
          setResults(rows);
          if (rows.length) subscribe(rows.map((r) => r.instrumentKey));
        })
        .catch((err) => {
          setResults([]);
          setHint(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => setSearching(false));
    }, 200);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, activeTab, subscribe]);

  function openOrder(inst: Instrument, side: Side) {
    setSelected(inst);
    setOrderSide(side);
    setOrderOpen(true);
    setExpanded(null);
  }

  /** Open chart/chain detail — on mobile this swaps list → detail only after explicit Chart/Chain tap. */
  function openChart(inst: Instrument) {
    selectInstrument(inst, 'chart');
  }

  function openChain(inst: Instrument) {
    selectInstrument(inst, 'chain');
  }

  function toggleInstrumentRow(inst: Instrument) {
    setSelected(inst);
    setExpanded((prev) => (prev === inst.instrumentKey ? null : inst.instrumentKey));
  }

  const saveTabId = useMemo(() => {
    if (isPersonalTab(activeTab)) return activeTab;
    return tabs.find((t) => isPersonalTab(t.tab))?.tab ?? 'MY';
  }, [activeTab, tabs]);

  const saveTabName = useMemo(
    () => tabs.find((t) => t.tab === saveTabId)?.name ?? MY_WATCHLIST_NAME,
    [tabs, saveTabId],
  );

  function focusAddSearch() {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function toggleWatchlist(inst: Instrument) {
    const tab = saveTabId;
    const inList = starred.has(inst.instrumentKey);
    const tabLabel = tabs.find((t) => t.tab === tab)?.name ?? MY_WATCHLIST_NAME;

    if (apiOk) {
      try {
        if (inList) {
          await api(`/watchlist/${tab}/${encodeURIComponent(inst.instrumentKey)}`, { method: 'DELETE' });
          setStarred((prev) => {
            const next = new Set(prev);
            next.delete(inst.instrumentKey);
            return next;
          });
          setToast(`Removed ${inst.symbol} from ${tabLabel}`);
        } else {
          await api(`/watchlist/${tab}`, {
            method: 'POST',
            body: JSON.stringify({ instrumentKey: inst.instrumentKey }),
          });
          setStarred((prev) => new Set(prev).add(inst.instrumentKey));
          setPulseKey(inst.instrumentKey);
          setTimeout(() => setPulseKey(null), 700);
          setToast(`Added ${inst.symbol} to ${tabLabel}`);
        }
        if (isPersonalTab(activeTab)) await loadItems(activeTab);
        await loadTabs();
        return;
      } catch { /* fall through to local */ }
    }

    const map = readLocal();
    const list = map[tab] ?? [];
    if (inList) {
      map[tab] = list.filter((i) => i.instrumentKey !== inst.instrumentKey);
      writeLocal(map);
      setStarred((prev) => {
        const next = new Set(prev);
        next.delete(inst.instrumentKey);
        return next;
      });
      setToast(`Removed ${inst.symbol} from ${tabLabel}`);
    } else {
      if (!list.some((i) => i.instrumentKey === inst.instrumentKey)) {
        map[tab] = [...list, inst];
        writeLocal(map);
      }
      setStarred((prev) => new Set(prev).add(inst.instrumentKey));
      setPulseKey(inst.instrumentKey);
      setTimeout(() => setPulseKey(null), 700);
      setToast(`Added ${inst.symbol} to ${tabLabel}`);
    }
    if (isPersonalTab(activeTab)) loadFromLocal(activeTab);
    else {
      setTabs((prev) => prev.map((t) => (
        t.tab === tab ? { ...t, count: (map[tab] ?? []).length } : t
      )));
    }
  }

  async function createWatchlist() {
    const name = window.prompt('Watchlist name', `Watchlist ${tabs.filter((t) => isPersonalTab(t.tab)).length + 1}`);
    if (!name?.trim()) return;
    setCreating(true);
    try {
      if (apiOk) {
        const created = await api<{ tab: string; name: string }>('/watchlist', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim() }),
        });
        await loadTabs();
        setActiveTab(created.tab);
        setToast(`Created “${created.name}”`);
      } else {
        const id = `WL${Date.now().toString().slice(-4)}`;
        const map = readLocal();
        map[id] = [];
        writeLocal(map);
        setTabs((prev) => orderTabs([...prev, { tab: id, name: name.trim(), count: 0 }]));
        setActiveTab(id);
        setToast(`Created “${name.trim()}” (local)`);
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not create list');
    } finally {
      setCreating(false);
    }
  }

  const selectedQuote = quotes[selected.instrumentKey];
  const displayItems = useMemo(() => items.filter((i) => i.instrument), [items]);
  const listRows = query.trim() ? results : browse;

  return (
    <AppShell userName={userName}>
      <div className={`wt${isMobile ? ` wt--mobile-${mobileView}` : ''}`}>
        {hint && <div className="wt-banner">{hint}</div>}
        <div className="wt-body">
          <aside className="wt-left">
            <div className="wt-tabs">
              <div className="wt-tabs-scroll">
                {tabs.map((t) => (
                  <button
                    key={t.tab}
                    type="button"
                    className={activeTab === t.tab ? 'on' : ''}
                    onClick={() => { setActiveTab(t.tab); setQuery(''); setExpanded(null); }}
                  >
                    {t.name}
                    <span className="cnt">{t.count}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="wt-new" disabled={creating} onClick={() => void createWatchlist()} title="New watchlist">+</button>
            </div>

            <div className="wt-search">
              <Icon.Search size={14} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isPersonalTab(activeTab)
                  ? `Search & add to ${saveTabName}…`
                  : 'Search NIFTY, RELIANCE, TCS…'}
                autoComplete="off"
              />
              {query && (
                <button type="button" className="wt-clear" onClick={() => setQuery('')}><Icon.X size={12} /></button>
              )}
            </div>

            <div className="wt-list" ref={listRef} onScroll={onListScroll}>
              {query.trim() ? (
                <>
                  <div className="wt-section">
                    {searching ? 'Searching…' : `${results.length} results`}
                    {isPersonalTab(activeTab) && !searching && (
                      <span className="wt-section-hint"> · tap + to add</span>
                    )}
                  </div>
                  {results.map((inst) => {
                    const q = quotes[inst.instrumentKey];
                    const inList = starred.has(inst.instrumentKey);
                    const isOpen = expanded === inst.instrumentKey;
                    const isSel = selected.instrumentKey === inst.instrumentKey;
                    return (
                      <div key={inst.instrumentKey} className={`wt-item ${isSel ? 'sel' : ''} ${isOpen ? 'open' : ''} ${pulseKey === inst.instrumentKey ? 'pulse' : ''}`}>
                        <div className="wt-row-top">
                          <button type="button" className="wt-main" onClick={() => toggleInstrumentRow(inst)}>
                            <div className="wt-sym">
                              <strong>{inst.symbol}</strong>
                              <span>{inst.exchange} · {inst.segment}</span>
                            </div>
                            <div className="wt-px">
                              <span className="ltp num">{q ? price(q.ltp) : '—'}</span>
                              <span className={`chg num ${q ? signClass(q.changePct) : ''}`}>{q ? pct(q.changePct) : '—'}</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`wt-add ${inList ? 'on' : ''}`}
                            aria-label={inList ? `Remove ${inst.symbol} from watchlist` : `Add ${inst.symbol} to watchlist`}
                            title={inList ? `Remove from ${saveTabName}` : `Add to ${saveTabName}`}
                            onClick={() => void toggleWatchlist(inst)}
                          >
                            {inList ? <Icon.Check size={14} /> : <span className="wt-add-plus">+</span>}
                          </button>
                        </div>
                        {isOpen && (
                          <div className="wt-actions">
                            <button
                              type="button"
                              className={`add ${inList ? 'on' : ''}`}
                              onClick={() => void toggleWatchlist(inst)}
                            >
                              {inList ? 'Added' : 'Add'}
                            </button>
                            <button type="button" className="buy" onClick={() => openOrder(inst, 'BUY')}>Buy</button>
                            <button type="button" className="sell" onClick={() => openOrder(inst, 'SELL')}>Sell</button>
                            <button type="button" onClick={() => openChart(inst)}>Chart</button>
                            <button type="button" onClick={() => openChain(inst)}>Chain</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!searching && results.length === 0 && <div className="wt-empty">No instruments match “{query}”.</div>}
                </>
              ) : (
                <>
                  <div className="wt-section wt-section-row">
                    <span>
                      {isCatalogTab(activeTab)
                        ? `${listRows.length}${browseEnd ? '' : '+'} ${tabs.find((t) => t.tab === activeTab)?.name ?? 'instruments'}`
                        : `${displayItems.length} saved`}
                      {browseLoading && ' · loading…'}
                    </span>
                    {isPersonalTab(activeTab) && (
                      <button type="button" className="wt-add-cta" onClick={focusAddSearch}>
                        + Add
                      </button>
                    )}
                  </div>
                  {isPersonalTab(activeTab) && displayItems.length === 0 && (
                    <div className="wt-empty wt-empty-cta">
                      <p>No symbols in {saveTabName} yet.</p>
                      <button type="button" className="wt-add-cta primary" onClick={focusAddSearch}>
                        Search &amp; add instruments
                      </button>
                      <p className="wt-empty-sub">Or open Stocks / Indices and tap + to save symbols here.</p>
                    </div>
                  )}
                  {(isCatalogTab(activeTab) ? listRows : displayItems.map((r) => r.instrument!)).map((inst) => {
                    const q = quotes[inst.instrumentKey];
                    const isOpen = expanded === inst.instrumentKey;
                    const isSel = selected.instrumentKey === inst.instrumentKey;
                    const inList = starred.has(inst.instrumentKey);
                    return (
                      <div key={inst.instrumentKey} className={`wt-item ${isSel ? 'sel' : ''} ${isOpen ? 'open' : ''} ${pulseKey === inst.instrumentKey ? 'pulse' : ''}`}>
                        <div className="wt-row-top">
                          <button
                            type="button"
                            className="wt-main"
                            onClick={() => toggleInstrumentRow(inst)}
                          >
                            <div className="wt-sym">
                              <strong>{inst.symbol}</strong>
                              <span>{inst.exchange} · {inst.segment}</span>
                            </div>
                            <div className="wt-px">
                              <span className="ltp num">{q ? price(q.ltp) : '—'}</span>
                              <span className={`chg num ${q ? signClass(q.changePct) : ''}`}>{q ? pct(q.changePct) : '—'}</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`wt-add ${inList ? 'on' : ''}`}
                            aria-label={inList ? `Remove ${inst.symbol} from watchlist` : `Add ${inst.symbol} to watchlist`}
                            title={inList ? `Remove from ${saveTabName}` : `Add to ${saveTabName}`}
                            onClick={() => void toggleWatchlist(inst)}
                          >
                            {isPersonalTab(activeTab)
                              ? <Icon.X size={14} />
                              : (inList ? <Icon.Star size={15} filled /> : <span className="wt-add-plus">+</span>)}
                          </button>
                        </div>
                        {isOpen && (
                          <div className="wt-actions">
                            <button
                              type="button"
                              className={`add ${inList ? 'on' : ''}`}
                              onClick={() => void toggleWatchlist(inst)}
                            >
                              {inList ? (isPersonalTab(activeTab) ? 'Remove' : 'Added') : 'Add'}
                            </button>
                            <button type="button" className="buy" onClick={() => openOrder(inst, 'BUY')}>Buy</button>
                            <button type="button" className="sell" onClick={() => openOrder(inst, 'SELL')}>Sell</button>
                            <button type="button" onClick={() => openChart(inst)}>Chart</button>
                            <button type="button" onClick={() => openChain(inst)}>Chain</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isCatalogTab(activeTab) && !browseLoading && listRows.length === 0 && (
                    <div className="wt-empty">No instruments in this segment — run <code>npm run sync:instruments</code> in backend/ (or bootstrap:dev for a starter set).</div>
                  )}
                </>
              )}
            </div>
          </aside>

          <main className="wt-center">
            <div className="wt-qbar">
              {isMobile && mobileView === 'detail' && (
                <button type="button" className="wt-back" onClick={goBackToList}>
                  <Icon.ChevronLeft size={16} />
                  Back
                </button>
              )}
              <div className="wt-q-left">
                <div className="wt-q-title">
                  <h1>{selected.symbol}</h1>
                  <span className="pill">{selected.exchange} · {selected.segment}</span>
                </div>
                <span className="dim" title={selected.name}>{selected.name}</span>
              </div>
              <div className="wt-q-right">
                <span className="ltp num">{selectedQuote ? price(selectedQuote.ltp) : '—'}</span>
                {selectedQuote && (
                  <span className={`chg num ${signClass(selectedQuote.changePct)}`}>
                    {selectedQuote.change >= 0 ? '+' : ''}{selectedQuote.change.toFixed(2)} ({pct(selectedQuote.changePct)})
                  </span>
                )}
              </div>
              <div className="wt-view-toggle">
                <button type="button" className={centerView === 'chart' ? 'on' : ''} onClick={() => setCenterView('chart')}>Chart</button>
                <button type="button" className={centerView === 'chain' ? 'on' : ''} onClick={() => setCenterView('chain')}>Option Chain</button>
              </div>
              <div className="wt-q-btns">
                <button type="button" className="buy" onClick={() => openOrder(selected, 'BUY')}>Buy</button>
                <button type="button" className="sell" onClick={() => openOrder(selected, 'SELL')}>Sell</button>
              </div>
            </div>
            <div className="wt-chart">
              {centerView === 'chart' ? (
                <Chart inst={selected} />
              ) : (
                <OptionChain
                  underlyingKey={chainUnderlying}
                  onSelect={(inst, side) => {
                    setSelected(inst);
                    if (side) openOrder(inst, side);
                  }}
                />
              )}
            </div>
          </main>
        </div>

        <OrderModal open={orderOpen} instrument={selected} initialSide={orderSide} onClose={() => setOrderOpen(false)} onPlaced={(msg) => setToast(msg)} />
        <TradeToast message={toast} onDone={() => setToast(null)} />
      </div>

      <style jsx>{`
        .wt {
          height: calc(100vh - 56px);
          background: var(--bg);
          color: var(--text);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .wt-banner {
          padding: 8px 14px; font-size: 12px;
          background: color-mix(in srgb, #f5c542 14%, var(--panel));
          color: #a87b00;
          border-bottom: 1px solid var(--line);
        }
        :global([data-theme="dark"]) .wt-banner { color: #f5c542; }
        .wt-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 320px minmax(0, 1fr); }
        .wt-left {
          display: flex; flex-direction: column; min-height: 0;
          background: var(--panel); border-right: 1px solid var(--line);
        }
        .wt-tabs {
          display: flex; align-items: center; gap: 4px;
          padding: 10px 8px 8px; border-bottom: 1px solid var(--line-soft);
        }
        .wt-tabs-scroll { flex: 1; display: flex; gap: 4px; overflow-x: auto; }
        .wt-tabs button {
          flex-shrink: 0; padding: 6px 10px; border-radius: 6px; border: none; background: transparent;
          color: var(--text-dim); font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .wt-tabs button.on { background: var(--panel-2); color: var(--text); box-shadow: var(--shadow-sm); }
        .wt-tabs .cnt { font-size: 10px; opacity: 0.6; }
        .wt-new {
          width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line);
          background: var(--panel-2); color: var(--text); font-size: 16px; cursor: pointer;
        }
        .wt-search {
          display: flex; align-items: center; gap: 8px; margin: 10px 12px; padding: 8px 10px; border-radius: 8px;
          background: var(--bg); border: 1px solid var(--line); color: var(--text-faint);
        }
        .wt-search input {
          flex: 1; border: none; outline: none; background: transparent;
          color: var(--text); font-size: 13px; font-family: inherit;
        }
        .wt-clear { background: none; border: none; color: var(--text-faint); cursor: pointer; display: grid; place-items: center; }
        .wt-list { flex: 1; overflow-y: auto; padding: 4px 0 16px; }
        .wt-section {
          padding: 8px 14px 4px; font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-faint);
        }
        .wt-section-row {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding-right: 10px;
        }
        .wt-section-hint { text-transform: none; letter-spacing: 0; opacity: 0.8; }
        .wt-empty { padding: 24px 16px; font-size: 12px; color: var(--text-dim); line-height: 1.45; }
        .wt-empty-cta { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .wt-empty-sub { margin: 0; font-size: 11px; color: var(--text-faint); }
        .wt-add-cta {
          appearance: none; border: 1px solid var(--line); background: var(--panel-2); color: var(--text);
          border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 600;
          cursor: pointer; font-family: inherit; text-transform: none; letter-spacing: 0;
        }
        .wt-add-cta.primary {
          border-color: var(--accent); background: var(--accent-soft); color: var(--text);
          padding: 8px 12px; font-size: 12px;
        }
        .wt-row, .wt-item { border-bottom: 1px solid var(--line-soft); }
        .wt-item { display: flex; flex-direction: column; align-items: stretch; min-width: 0; }
        .wt-row-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 44px;
          align-items: stretch;
          width: 100%;
          min-width: 0;
        }
        .wt-item .wt-main { min-width: 0; width: 100%; }
        .wt-item .wt-add { width: 44px; }
        .wt-item .wt-actions { width: 100%; }
        .wt-row { display: flex; align-items: stretch; }
        .wt-item.pulse { animation: starPulse 0.6s ease; }
        @keyframes starPulse {
          0% { background: var(--accent-soft); }
          100% { background: transparent; }
        }
        .wt-main {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 8px 10px 12px; text-align: left; background: none; border: none; color: inherit;
          cursor: pointer; font-family: inherit; min-width: 0;
        }
        .wt-item.sel .wt-main { background: var(--accent-soft); }
        .wt-main:hover { background: var(--panel-hover); }
        .wt-sym { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .wt-sym strong { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
        .wt-sym span { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }
        .wt-px { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .ltp { font-size: 13px; font-weight: 500; color: var(--text); }
        .chg { font-size: 11px; }
        .wt-add {
          width: 44px; border: none; background: transparent; color: var(--text-faint);
          cursor: pointer; display: grid; place-items: center; flex-shrink: 0;
        }
        .wt-add.on { color: #d4a017; }
        .wt-add:hover { color: var(--text); background: var(--panel-hover); }
        .wt-add-plus { font-size: 20px; font-weight: 600; line-height: 1; color: var(--accent); }
        .wt-actions {
          display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; padding: 0 12px 10px;
          animation: slideDown 0.15s ease;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .wt-actions button {
          padding: 7px 4px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel-2);
          color: var(--text); font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit;
          min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wt-actions .buy { color: var(--gain); border-color: color-mix(in srgb, var(--gain) 35%, var(--line)); }
        .wt-actions .sell { color: var(--loss); border-color: color-mix(in srgb, var(--loss) 35%, var(--line)); }
        .wt-actions .add { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
        .wt-actions .add.on { background: var(--accent-soft); }
        @media (max-width: 700px) {
          .wt-actions {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .wt-center { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
        .wt-qbar {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--panel);
        }
        .wt-q-left {
          display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
          flex: 1 1 180px; min-width: 0; max-width: calc(100% - 220px);
        }
        .wt-q-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; max-width: 100%; }
        .wt-q-left h1 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); white-space: nowrap; }
        .dim {
          color: var(--text-dim); font-size: 12px; max-width: 100%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pill {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
          padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--text-faint);
          flex-shrink: 0;
        }
        .wt-q-right { display: flex; align-items: baseline; gap: 10px; flex-shrink: 0; margin-left: auto; }
        .wt-q-right .ltp { font-size: 22px; font-weight: 500; }
        .wt-view-toggle {
          display: inline-flex; gap: 2px; padding: 3px; border-radius: 8px;
          background: var(--bg); border: 1px solid var(--line);
        }
        .wt-view-toggle button {
          padding: 6px 12px; border: none; border-radius: 6px; background: transparent; color: var(--text-dim);
          font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit;
        }
        .wt-view-toggle button.on { background: var(--panel); color: var(--text); box-shadow: var(--shadow-sm); }
        .wt-q-btns { display: flex; gap: 8px; flex-shrink: 0; margin-left: auto; }
        .wt-q-btns button {
          min-width: 80px; padding: 10px 16px; border-radius: 8px; border: none;
          font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; color: #fff;
        }
        .wt-q-btns .buy { background: var(--gain); }
        .wt-q-btns .sell { background: var(--loss); }
        .wt-chart { flex: 1; min-height: 0; padding: 8px; background: var(--bg); overflow: hidden; position: relative; }
      `}</style>
    </AppShell>
  );
}

export default function WatchlistPage() {
  return (
    <Suspense fallback={<AppShell><div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading…</div></AppShell>}>
      <WatchlistInner />
    </Suspense>
  );
}
