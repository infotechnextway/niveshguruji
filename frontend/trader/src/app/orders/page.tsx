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

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Time</th><th>Instrument</th><th>Type</th><th className="r">Qty</th>
                <th className="r">Price</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
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
                    {o.filledPrice ? price(o.filledPrice) : o.limitPrice ? `${price(o.limitPrice)} L` : '—'}
                  </td>
                  <td>
                    <span className={`st ${o.status.toLowerCase()}`}>{o.status}</span>
                    {o.reason && <div className="muted tiny">{o.reason}</div>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="empty">No orders match your filters.</td></tr>
              )}
            </tbody>
          </table>
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
        td { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
        th.r, td.r { text-align: right; }
        .side { display: inline-block; margin-right: 8px; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
        .side.buy { color: var(--gain); background: color-mix(in srgb, var(--gain) 12%, transparent); }
        .side.sell { color: var(--loss); background: color-mix(in srgb, var(--loss) 12%, transparent); }
        .st { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
        .st.pending { color: #f5c542; }
        .st.executed { color: var(--gain); }
        .st.rejected { color: var(--loss); }
        .st.cancelled { color: var(--text-faint); }
        .muted { color: var(--text-dim); }
        .tiny { font-size: 10px; margin-top: 2px; }
        .empty { text-align: center; padding: 32px; color: var(--text-faint); }
        @media (max-width: 700px) { .op { padding: 16px; } .search { min-width: 100%; } }
      `}</style>
    </AppShell>
  );
}
