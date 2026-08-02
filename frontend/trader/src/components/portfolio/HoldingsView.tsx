'use client';
import { useEffect } from 'react';
import { useQuotes } from '@/lib/quote-store';
import { price, pct, signClass } from '@/lib/format';

interface Holding { instrumentKey: string; symbol: string; qty: number; avgPrice: number; prevClose: number }

const DEMO: Holding[] = [
  { instrumentKey: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', qty: 50, avgPrice: 2820.30, prevClose: 2870 },
  { instrumentKey: 'NSE_EQ|INE467B01029', symbol: 'TCS', qty: 20, avgPrice: 3785.00, prevClose: 3810 },
  { instrumentKey: 'NSE_EQ|INE040A01034', symbol: 'HDFCBANK', qty: 100, avgPrice: 1602.75, prevClose: 1612 },
  { instrumentKey: 'NSE_EQ|INE009A01021', symbol: 'INFY', qty: 75, avgPrice: 1480.10, prevClose: 1492 },
];

/** Delivery holdings table + value/P&L cards (logic unchanged from /holdings). */
export function HoldingsView() {
  const quotes = useQuotes((s) => s.quotes);
  const subscribe = useQuotes((s) => s.subscribe);
  useEffect(() => { subscribe(DEMO.map((i) => i.instrumentKey)); }, [subscribe]);

  const rows = DEMO.map((h) => {
    const ltp = quotes[h.instrumentKey]?.ltp ?? h.avgPrice;
    const value = ltp * h.qty;
    const overall = (ltp - h.avgPrice) * h.qty;
    const today = (ltp - h.prevClose) * h.qty;
    return { ...h, ltp, value, overall, today };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalOverall = rows.reduce((s, r) => s + r.overall, 0);
  const totalToday = rows.reduce((s, r) => s + r.today, 0);

  return (
    <div className="hv">
      <div className="stats">
        <div className="stat">
          <span>Total value</span>
          <strong className="num">{price(totalValue)}</strong>
        </div>
        <div className="stat">
          <span>Today&apos;s P&amp;L</span>
          <strong className={`num ${signClass(totalToday)}`}>{totalToday >= 0 ? '+' : ''}{totalToday.toFixed(2)}</strong>
        </div>
        <div className="stat">
          <span>Overall P&amp;L</span>
          <strong className={`num ${signClass(totalOverall)}`}>{totalOverall >= 0 ? '+' : ''}{totalOverall.toFixed(2)}</strong>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th className="r">Qty</th>
              <th className="r">Avg</th>
              <th className="r">Current</th>
              <th className="r">Value</th>
              <th className="r">Today</th>
              <th className="r">Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.instrumentKey}>
                <td><strong>{h.symbol}</strong></td>
                <td className="r num">{h.qty}</td>
                <td className="r num">{price(h.avgPrice)}</td>
                <td className="r num">{price(h.ltp)}</td>
                <td className="r num">{price(h.value)}</td>
                <td className={`r num ${signClass(h.today)}`}>{h.today >= 0 ? '+' : ''}{h.today.toFixed(2)}</td>
                <td className={`r num ${signClass(h.overall)}`}>
                  {h.overall >= 0 ? '+' : ''}{h.overall.toFixed(2)}
                  <div className="tiny muted">{pct(((h.ltp - h.avgPrice) / h.avgPrice) * 100)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .hv { display: flex; flex-direction: column; gap: 16px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stat {
          background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px;
        }
        .stat span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); margin-bottom: 6px; }
        .stat strong { font-size: 20px; font-weight: 500; }
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 12px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); border-bottom: 1px solid var(--line); }
        td { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
        th.r, td.r { text-align: right; }
        .tiny { font-size: 10px; margin-top: 2px; }
        .muted { color: var(--text-faint); }
        @media (max-width: 700px) { .stats { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
