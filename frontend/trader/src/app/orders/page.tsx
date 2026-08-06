'use client';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { price } from '@/lib/format';
import { Icon } from '@/components/Icons';

type Status = 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
interface Order {
  id: string; at: string; symbol: string; side: 'BUY' | 'SELL';
  type: string; product: string; qty: number;
  filledPrice?: number; limitPrice?: number; status: Status; reason?: string;
}

const DEMO: Order[] = [
  { id: 'O-1029', at: '10:14:22', symbol: 'RELIANCE', side: 'BUY', type: 'MARKET', product: 'MIS', qty: 20, filledPrice: 2884.50, status: 'EXECUTED' },
  { id: 'O-1028', at: '10:11:04', symbol: 'INFY', side: 'SELL', type: 'LIMIT', product: 'MIS', qty: 15, filledPrice: 1495.20, limitPrice: 1495, status: 'EXECUTED' },
  { id: 'O-1027', at: '09:48:11', symbol: 'HDFCBANK', side: 'BUY', type: 'LIMIT', product: 'CNC', qty: 30, limitPrice: 1610, status: 'PENDING' },
  { id: 'O-1026', at: '09:32:55', symbol: 'TCS', side: 'BUY', type: 'LIMIT', product: 'MIS', qty: 5, limitPrice: 3810, status: 'REJECTED', reason: 'Limit price not met' },
  { id: 'O-1025', at: '09:20:03', symbol: 'ICICIBANK', side: 'SELL', type: 'LIMIT', product: 'MIS', qty: 40, limitPrice: 1090, status: 'CANCELLED' },
  { id: 'O-1024', at: '09:18:40', symbol: 'NIFTY 50', side: 'BUY', type: 'SL', product: 'MIS', qty: 50, limitPrice: 22100, status: 'PENDING' },
];

const FILTERS: Array<{ id: Status | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'EXECUTED', label: 'Executed' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

function orderPriceLabel(o: Order): { value: string; tag?: string } {
  if (o.filledPrice != null) return { value: price(o.filledPrice) };
  if (o.limitPrice != null) return { value: price(o.limitPrice), tag: o.type === 'SL' ? 'SL' : 'LMT' };
  return { value: '—' };
}

export default function OrdersPage() {
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const [q, setQ] = useState('');

  const rows = useMemo(() => DEMO.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return o.symbol.toLowerCase().includes(s) || o.id.toLowerCase().includes(s);
  }), [filter, q]);

  return (
    <AppShell>
      <main className="op">
        <div className="head">
          <div>
            <h1>Orders</h1>
            <p>Pending, executed, rejected, and cancelled — search and filter.</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
                <span>{f.id === 'ALL' ? DEMO.length : DEMO.filter((o) => o.status === f.id).length}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <Icon.Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol or order id…" />
          </div>
        </div>

        {/* Desktop table */}
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th><th>Instrument</th><th>Type</th><th className="r">Qty</th>
                <th className="r">Price</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const px = orderPriceLabel(o);
                return (
                  <tr key={o.id}>
                    <td className="num muted">{o.at}</td>
                    <td>
                      <span className={`side ${o.side.toLowerCase()}`}>{o.side}</span>
                      <strong>{o.symbol}</strong>
                    </td>
                    <td>
                      <div>{o.type}</div>
                      <div className="muted tiny">{o.product}</div>
                    </td>
                    <td className="r num">{o.qty}</td>
                    <td className="r num">
                      {px.value}
                      {px.tag && <span className="px-tag">{px.tag}</span>}
                    </td>
                    <td>
                      <span className={`st ${o.status.toLowerCase()}`}>{o.status}</span>
                      {o.reason && <div className="muted tiny">{o.reason}</div>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="empty">No orders match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="cards" aria-label="Orders">
          {rows.map((o) => {
            const px = orderPriceLabel(o);
            return (
              <article key={o.id} className="order-card">
                <div className="oc-top">
                  <div className="oc-sym">
                    <span className={`side ${o.side.toLowerCase()}`}>{o.side}</span>
                    <strong>{o.symbol}</strong>
                  </div>
                  <span className={`st ${o.status.toLowerCase()}`}>{o.status}</span>
                </div>
                <div className="oc-meta">
                  <span>{o.type} · {o.product}</span>
                  <span className="num muted">{o.at}</span>
                </div>
                <div className="oc-grid">
                  <div>
                    <span className="lbl">Qty</span>
                    <strong className="num">{o.qty}</strong>
                  </div>
                  <div>
                    <span className="lbl">Price</span>
                    <strong className="num">
                      {px.value}
                      {px.tag && <span className="px-tag">{px.tag}</span>}
                    </strong>
                  </div>
                  <div>
                    <span className="lbl">Order</span>
                    <strong className="num muted">{o.id}</strong>
                  </div>
                </div>
                {o.reason && <div className="oc-reason">{o.reason}</div>}
              </article>
            );
          })}
          {rows.length === 0 && <div className="empty">No orders match your filters.</div>}
        </div>
      </main>
      <style jsx>{`
        .op { max-width: 1200px; margin: 0 auto; padding: 24px 28px 48px; }
        .head h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
        .head p { margin: 6px 0 0; color: var(--text-dim); font-size: 13px; }
        .toolbar { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; margin: 20px 0 14px; }
        .filters { display: flex; flex-wrap: wrap; gap: 6px; }
        .filters button {
          display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px;
          border: 1px solid var(--line); background: var(--panel); color: var(--text-dim);
          font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
        }
        .filters button.on { color: var(--text); border-color: var(--accent); background: var(--accent-soft); }
        .filters span { font-size: 10px; opacity: 0.7; font-variant-numeric: tabular-nums; }
        .search {
          display: flex; align-items: center; gap: 8px; min-width: 240px;
          padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--text-faint);
        }
        .search input { flex: 1; border: none; outline: none; background: transparent; color: var(--text); font-size: 13px; font-family: inherit; }
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 12px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); border-bottom: 1px solid var(--line); }
        td { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
        th.r, td.r { text-align: right; }
        .side { display: inline-block; margin-right: 8px; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
        .side.buy { color: var(--gain); background: color-mix(in srgb, var(--gain) 12%, transparent); }
        .side.sell { color: var(--loss); background: color-mix(in srgb, var(--loss) 12%, transparent); }
        .st { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
        .st.pending { color: #f5c542; }
        .st.executed { color: var(--gain); }
        .st.rejected { color: var(--loss); }
        .st.cancelled { color: var(--text-faint); }
        .px-tag {
          display: inline-block; margin-left: 6px; padding: 1px 5px; border-radius: 4px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.04em; vertical-align: middle;
          color: var(--text-dim); background: var(--panel-2); border: 1px solid var(--line);
          white-space: nowrap;
        }
        .muted { color: var(--text-dim); }
        .tiny { font-size: 10px; margin-top: 2px; }
        .empty { text-align: center; padding: 32px; color: var(--text-faint); }
        .cards { display: none; }

        @media (max-width: 700px) {
          .op { padding: 16px 14px 32px; }
          .search { min-width: 100%; }
          .table-wrap { display: none; }
          .cards { display: flex; flex-direction: column; gap: 10px; }
          .order-card {
            background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
            padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
          }
          .oc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
          .oc-sym { display: flex; align-items: center; gap: 0; min-width: 0; }
          .oc-sym strong { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
          .oc-meta { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--text-dim); }
          .oc-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
            padding-top: 4px; border-top: 1px solid var(--line-soft);
          }
          .oc-grid .lbl {
            display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
            color: var(--text-faint); margin-bottom: 2px;
          }
          .oc-grid strong { font-size: 13px; font-weight: 500; }
          .oc-reason { font-size: 11px; color: var(--loss); }
        }
      `}</style>
    </AppShell>
  );
}
