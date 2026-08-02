'use client';
import { useQuotes } from '@/lib/quote-store';
import type { Instrument } from '@/lib/types';
import { paise, price, pct, signClass } from '@/lib/format';

interface Pos { instrumentKey: string; symbol: string; netQty: number; avgPrice: number; product: string; }

export function PositionsPanel({ instruments, samplePositions }: { instruments: Instrument[]; samplePositions: Pos[] }) {
  const quotes = useQuotes((s) => s.quotes);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 500 }}>Positions</span>
        <span className="dim num" style={{ fontSize: 11 }}>{samplePositions.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th><th className="r">Qty</th><th className="r">Avg</th>
              <th className="r">LTP</th><th className="r">Chg</th><th className="r">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {samplePositions.map((p) => {
              const q = quotes[p.instrumentKey];
              const ltp = q?.ltp ?? p.avgPrice;
              const pnl = Math.round((ltp - p.avgPrice) * p.netQty * 100);
              const chg = ltp - p.avgPrice;
              return (
                <tr key={p.instrumentKey + p.product}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{p.symbol}</span>
                      <span className="dim" style={{ fontSize: 10 }}>{p.product === 'INTRADAY' ? 'MIS' : 'CNC'}</span>
                    </div>
                  </td>
                  <td className={`r num ${p.netQty < 0 ? 'loss' : ''}`}>{p.netQty}</td>
                  <td className="r num">{price(p.avgPrice)}</td>
                  <td className="r num">{price(ltp)}</td>
                  <td className={`r num ${signClass(chg)}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}</td>
                  <td className={`r num ${signClass(pnl)}`}>{paise(pnl, { sign: true, decimals: false })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
