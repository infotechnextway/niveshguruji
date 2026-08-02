'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useQuotes } from '@/lib/quote-store';
import { paise, price, pct, signClass } from '@/lib/format';

interface Row { instrumentKey: string; symbol: string; product: string; netQty: number; avgPrice: number; }

export function PositionsTable({ rows, title = 'Positions', href = '/portfolio?tab=positions' }: { rows: Row[]; title?: string; href?: string }) {
  const quotes = useQuotes((s) => s.quotes);
  const subscribe = useQuotes((s) => s.subscribe);

  useEffect(() => {
    subscribe(rows.map((r) => r.instrumentKey));
  }, [subscribe, rows]);
  return (
    <div className="pt card-lg">
      <div className="pt-head">
        <h3 className="pt-title">{title} <span className="num dim">({rows.length})</span></h3>
        <Link href={href} className="pt-link">View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="pt-empty">No open positions.</div>
      ) : (
        <div className="pt-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Instrument</th><th className="r">Qty</th><th className="r">Avg</th>
                <th className="r">LTP</th><th className="r">Change</th><th className="r">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ltp = quotes[r.instrumentKey]?.ltp ?? r.avgPrice;
                const pnl = Math.round((ltp - r.avgPrice) * r.netQty * 100);
                const pnlPct = r.avgPrice ? ((ltp - r.avgPrice) / r.avgPrice) * 100 * (r.netQty < 0 ? -1 : 1) : 0;
                return (
                  <tr key={r.instrumentKey + r.product}>
                    <td>
                      <div className="vstack gap-1">
                        <span className="pt-sym">{r.symbol}</span>
                        <span className="badge badge-neutral">{r.product === 'INTRADAY' ? 'MIS' : 'CNC'}</span>
                      </div>
                    </td>
                    <td className={`r num ${r.netQty < 0 ? 'loss' : ''}`}>{r.netQty}</td>
                    <td className="r num">{price(r.avgPrice)}</td>
                    <td className="r num">{price(ltp)}</td>
                    <td className={`r num ${signClass(ltp - r.avgPrice)}`}>{pct(pnlPct)}</td>
                    <td className={`r num ${signClass(pnl)}`}>{paise(pnl, { sign: true, decimals: false })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style jsx>{`
        .pt { padding: 0; }
        .pt-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--line-soft); }
        .pt-title { font-size: 13px; font-weight: 500; }
        .pt-link { font-size: 11px; color: var(--accent); text-decoration: none; }
        .pt-link:hover { text-decoration: underline; }
        .pt-empty { padding: 40px 20px; text-align: center; color: var(--text-faint); font-size: 12px; }
        .pt-table-wrap { overflow-x: auto; }
        .pt-sym { font-weight: 500; }
      `}</style>
    </div>
  );
}
