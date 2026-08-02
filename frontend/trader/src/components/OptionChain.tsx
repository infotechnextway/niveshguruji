'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { price } from '@/lib/format';
import { useQuotes } from '@/lib/quote-store';
import type { Instrument } from '@/lib/types';

interface ChainLeg { instrumentKey: string; symbol: string; ltp: number | null }
interface StrikeRow { strike: number; ce?: ChainLeg; pe?: ChainLeg }
interface ChainResponse {
  underlying: string;
  expiry: string | null;
  spot: number | null;
  strikes: StrikeRow[];
}

export function OptionChain({
  underlyingKey,
  onSelect,
  onClose,
}: {
  underlyingKey: string;
  onSelect?: (inst: Instrument, side?: 'BUY' | 'SELL') => void;
  onClose?: () => void;
}) {
  const [expiries, setExpiries] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<string>('');
  const [chain, setChain] = useState<ChainResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expiriesLoaded, setExpiriesLoaded] = useState(false);
  const subscribe = useQuotes((s) => s.subscribe);
  const quotes = useQuotes((s) => s.quotes);

  useEffect(() => {
    let cancelled = false;
    setExpiriesLoaded(false);
    setExpiries([]);
    setExpiry('');
    setChain(null);
    api<string[]>(`/market/expiries/${encodeURIComponent(underlyingKey)}`)
      .then((list) => {
        if (cancelled) return;
        setExpiries(list);
        if (list[0]) setExpiry(list[0]);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load expiries'); })
      .finally(() => { if (!cancelled) setExpiriesLoaded(true); });
    return () => { cancelled = true; };
  }, [underlyingKey]);

  useEffect(() => {
    if (!expiry) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ underlyingKey, expiry, atmSpan: '15' });
    api<ChainResponse>(`/market/option-chain?${qs}`)
      .then((data) => {
        if (cancelled) return;
        setChain(data);
        const keys: string[] = [];
        for (const s of data.strikes) {
          if (s.ce) keys.push(s.ce.instrumentKey);
          if (s.pe) keys.push(s.pe.instrumentKey);
        }
        if (keys.length) subscribe(keys);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Chain failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [underlyingKey, expiry, subscribe]);

  function pick(leg: ChainLeg, optType: 'CE' | 'PE') {
    onSelect?.({
      instrumentKey: leg.instrumentKey,
      symbol: leg.symbol,
      name: `${leg.symbol}`,
      exchange: 'NSE',
      segment: 'FO',
      lotSize: 1,
    }, 'BUY');
  }

  return (
    <div className="oc">
      <div className="oc-head">
        <div>
          <div className="oc-title">Option chain</div>
          <div className="dim" style={{ fontSize: 11 }}>
            Spot {chain?.spot != null ? price(chain.spot) : '—'}
          </div>
        </div>
        <div className="oc-controls">
          <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            {expiries.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {onClose && <button type="button" className="oc-close" onClick={onClose}>Close</button>}
        </div>
      </div>
      {error && <div className="oc-err">{error}</div>}
      {loading && !chain && <div className="dim" style={{ padding: 16, fontSize: 12 }}>Loading…</div>}
      {!loading && expiriesLoaded && !error && expiries.length === 0 && (
        <div className="oc-empty">No NSE FO expiries for this symbol. Index options (NIFTY, BANKNIFTY) are supported.</div>
      )}
      {!loading && chain && chain.strikes.length === 0 && !error && (
        <div className="oc-empty">No strikes for the selected expiry.</div>
      )}
      <div className="oc-table-wrap">
        <table className="oc-table">
          <thead>
            <tr>
              <th className="r">CE LTP</th>
              <th>Strike</th>
              <th>PE LTP</th>
            </tr>
          </thead>
          <tbody>
            {(chain?.strikes ?? []).map((row) => {
              const ceLtp = row.ce ? (quotes[row.ce.instrumentKey]?.ltp ?? row.ce.ltp) : null;
              const peLtp = row.pe ? (quotes[row.pe.instrumentKey]?.ltp ?? row.pe.ltp) : null;
              const atm = chain?.spot != null && Math.abs(row.strike - chain.spot) < (chain.spot * 0.002);
              return (
                <tr key={row.strike} className={atm ? 'atm' : ''}>
                  <td className="r">
                    {row.ce ? (
                      <button type="button" className="leg ce" onClick={() => pick(row.ce!, 'CE')}>
                        {ceLtp != null ? price(ceLtp) : '—'}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="strike num">{row.strike}</td>
                  <td>
                    {row.pe ? (
                      <button type="button" className="leg pe" onClick={() => pick(row.pe!, 'PE')}>
                        {peLtp != null ? price(peLtp) : '—'}
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .oc { display: flex; flex-direction: column; height: 100%; min-height: 0; }
        .oc-head { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--line-soft); align-items: center; }
        .oc-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .oc-controls { display: flex; gap: 8px; align-items: center; }
        .oc-controls select { background: var(--panel-2); border: 1px solid var(--line); color: var(--text); border-radius: 4px; padding: 4px 8px; font-size: 12px; }
        .oc-close { font-size: 11px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); color: var(--text); }
        .oc-err { padding: 8px 14px; font-size: 12px; color: var(--loss); }
        .oc-empty { padding: 16px 14px; font-size: 12px; color: var(--text-dim); line-height: 1.45; }
        .oc-table-wrap { flex: 1; overflow: auto; min-height: 0; }
        .oc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .oc-table th { position: sticky; top: 0; background: var(--panel-2); text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); }
        .oc-table th.r, .oc-table td.r { text-align: right; }
        .oc-table td { padding: 6px 12px; border-top: 1px solid var(--line-soft); }
        .oc-table tr.atm { background: var(--accent-soft); }
        .strike { text-align: center; font-weight: 600; }
        .leg { background: transparent; border: none; cursor: pointer; font-family: var(--mono); font-size: 12px; padding: 2px 6px; border-radius: 3px; }
        .leg.ce { color: var(--gain); }
        .leg.pe { color: var(--loss); }
        .leg:hover { background: var(--panel-hover); }
      `}</style>
    </div>
  );
}
