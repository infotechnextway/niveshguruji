'use client';
import { useEffect, useState } from 'react';
import { useQuotes } from '@/lib/quote-store';
import { price, signClass } from '@/lib/format';
import { TradeToast } from '@/components/trading/TradeToast';

const DEMO = [
  { instrumentKey: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', product: 'MIS', netQty: 20, avgPrice: 2884.50 },
  { instrumentKey: 'NSE_EQ|INE009A01021', symbol: 'INFY', product: 'MIS', netQty: -15, avgPrice: 1495.20 },
];

/** Open positions table + MTM summary (logic unchanged from /positions). */
export function PositionsView() {
  const quotes = useQuotes((s) => s.quotes);
  const subscribe = useQuotes((s) => s.subscribe);
  const [rows, setRows] = useState(DEMO);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    subscribe(DEMO.map((i) => i.instrumentKey));
  }, [subscribe]);

  const withMtm = rows.map((p) => {
    const ltp = quotes[p.instrumentKey]?.ltp ?? p.avgPrice;
    const pnl = (ltp - p.avgPrice) * p.netQty;
    return { ...p, ltp, pnl };
  });
  const total = withMtm.reduce((s, r) => s + r.pnl, 0);

  function exit(key: string, symbol: string) {
    setRows((prev) => prev.filter((r) => r.instrumentKey !== key));
    setToast(`Exited ${symbol}`);
  }

  return (
    <div className="pv">
      <div className="total">
        <span>MTM</span>
        <strong className={`num ${signClass(total)}`}>
          {total >= 0 ? '+' : ''}{total.toFixed(2)}
        </strong>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Symbol</th><th className="r">Qty</th><th className="r">Avg</th>
              <th className="r">LTP</th><th className="r">MTM</th><th className="r">P&amp;L</th><th></th>
            </tr>
          </thead>
          <tbody>
            {withMtm.map((p) => (
              <tr key={p.instrumentKey}>
                <td>
                  <strong>{p.symbol}</strong>
                  <div className="muted">{p.product}</div>
                </td>
                <td className={`r num ${p.netQty < 0 ? 'loss' : ''}`}>{p.netQty}</td>
                <td className="r num">{price(p.avgPrice)}</td>
                <td className="r num">{price(p.ltp)}</td>
                <td className={`r num ${signClass(p.pnl)}`}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}</td>
                <td className={`r num ${signClass(p.pnl)}`}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}</td>
                <td className="r">
                  <button type="button" className="exit" onClick={() => exit(p.instrumentKey, p.symbol)}>
                    Exit
                  </button>
                </td>
              </tr>
            ))}
            {withMtm.length === 0 && (
              <tr><td colSpan={7} className="empty">No open positions.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cards" aria-label="Positions">
        {withMtm.map((p) => (
          <article key={p.instrumentKey} className="pos-card">
            <div className="pc-top">
              <div className="pc-sym">
                <strong>{p.symbol}</strong>
                <span className="muted">
                  {p.product} · {p.netQty < 0 ? 'SHORT' : 'LONG'} {Math.abs(p.netQty)}
                </span>
              </div>
              <button type="button" className="exit" onClick={() => exit(p.instrumentKey, p.symbol)}>
                Exit
              </button>
            </div>
            <div className="pc-grid">
              <div>
                <span className="lbl">Avg</span>
                <strong className="num">{price(p.avgPrice)}</strong>
              </div>
              <div>
                <span className="lbl">LTP</span>
                <strong className="num">{price(p.ltp)}</strong>
              </div>
              <div>
                <span className="lbl">MTM</span>
                <strong className={`num ${signClass(p.pnl)}`}>
                  {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="lbl">P&amp;L</span>
                <strong className={`num ${signClass(p.pnl)}`}>
                  {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}
                </strong>
              </div>
            </div>
          </article>
        ))}
        {withMtm.length === 0 && <div className="empty">No open positions.</div>}
      </div>

      <TradeToast message={toast} onDone={() => setToast(null)} />
      <style jsx>{`
        .pv { display: flex; flex-direction: column; gap: 16px; }
        .total { text-align: center; align-self: center; width: 100%; }
        .total span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); }
        .total strong { font-size: 22px; font-weight: 500; }
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 12px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); border-bottom: 1px solid var(--line); }
        td { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
        th.r, td.r { text-align: right; }
        .muted { font-size: 10px; color: var(--text-faint); margin-top: 2px; }
        .exit {
          padding: 6px 10px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--loss) 40%, var(--line));
          background: color-mix(in srgb, var(--loss) 10%, transparent); color: var(--loss);
          font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap;
        }
        .empty { text-align: center; padding: 36px; color: var(--text-faint); }
        .cards { display: none; }
        .loss { color: var(--loss); }

        @media (max-width: 700px) {
          .table-wrap { display: none; }
          .cards { display: flex; flex-direction: column; gap: 10px; }
          .pos-card {
            background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
            padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;
          }
          .pc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
          .pc-sym { min-width: 0; }
          .pc-sym strong { display: block; font-size: 14px; font-weight: 600; }
          .pc-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px;
            padding-top: 8px; border-top: 1px solid var(--line-soft);
          }
          .pc-grid .lbl {
            display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
            color: var(--text-faint); margin-bottom: 2px;
          }
          .pc-grid strong { font-size: 13px; font-weight: 500; }
        }
      `}</style>
    </div>
  );
}
