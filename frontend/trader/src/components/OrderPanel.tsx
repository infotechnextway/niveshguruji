'use client';
import { useEffect, useState } from 'react';
import type { Instrument } from '@/lib/types';
import { useQuotes } from '@/lib/quote-store';
import { price } from '@/lib/format';
import { RiskMeter } from './RiskMeter';

type Side = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT';
type Product = 'INTRADAY' | 'CARRY_FORWARD';
type Attach = 'NONE' | 'SL' | 'TARGET';

/** Institutional order ticket. BUY/SELL segmented, product tabs, price input,
 *  optional single trigger (SL XOR Target — SRS mutual exclusion), estimated
 *  margin and charges preview, submit. */
export function OrderPanel({ inst, challengeId, onPlaced, preferredSide }: {
  inst: Instrument; challengeId: string; onPlaced?: (msg: string, ok: boolean) => void;
  preferredSide?: Side;
}) {
  const [side, setSide] = useState<Side>(preferredSide ?? 'BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [product, setProduct] = useState<Product>('INTRADAY');
  const [qty, setQty] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [attach, setAttach] = useState<Attach>('NONE');
  const [attachPrice, setAttachPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const q = useQuotes((s) => s.quotes[inst.instrumentKey]);

  useEffect(() => {
    if (preferredSide) setSide(preferredSide);
  }, [preferredSide, inst.instrumentKey]);

  const estPrice = type === 'MARKET' ? (side === 'BUY' ? q?.ask : q?.bid) ?? q?.ltp ?? 0
                                     : Number(limitPrice) || 0;
  const estValue = estPrice * qty;
  const estCharges = 0; // charges.model default flat+turnoverBps:0

  async function submit() {
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      onPlaced?.(`${side} ${qty} ${inst.symbol} @ ${type === 'MARKET' ? 'market' : price(estPrice)} placed`, true);
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 14, gap: 12 }}>
      {/* Side */}
      <div className="side-toggle">
        <button className={`side-btn buy ${side === 'BUY' ? 'on' : ''}`} onClick={() => setSide('BUY')}>Buy</button>
        <button className={`side-btn sell ${side === 'SELL' ? 'on' : ''}`} onClick={() => setSide('SELL')}>Sell</button>
      </div>

      {/* Product */}
      <div className="row-lbl">Product</div>
      <div className="seg-row">
        {(['INTRADAY', 'CARRY_FORWARD'] as const).map((p) => (
          <button key={p} className={`seg ${product === p ? 'on' : ''}`} onClick={() => setProduct(p)}>
            {p === 'INTRADAY' ? 'MIS' : 'CNC'}
          </button>
        ))}
      </div>

      {/* Order type */}
      <div className="row-lbl">Order type</div>
      <div className="seg-row">
        {(['MARKET', 'LIMIT'] as const).map((t) => (
          <button key={t} className={`seg ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>{t}</button>
        ))}
      </div>

      {/* Qty + Price */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div className="row-lbl">Quantity</div>
          <input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        {type === 'LIMIT' && (
          <div>
            <div className="row-lbl">Limit price</div>
            <input className="input" type="number" step="0.05" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
          </div>
        )}
      </div>

      {/* Attach — SL XOR TARGET */}
      <div className="row-lbl">Trigger (optional)</div>
      <div className="seg-row">
        {(['NONE', 'SL', 'TARGET'] as const).map((a) => (
          <button key={a} className={`seg ${attach === a ? 'on' : ''}`} onClick={() => setAttach(a)}>{a === 'NONE' ? 'None' : a}</button>
        ))}
      </div>
      {attach !== 'NONE' && (
        <input className="input" placeholder={`${attach === 'SL' ? 'Stop-loss' : 'Target'} price`} type="number" value={attachPrice} onChange={(e) => setAttachPrice(e.target.value)} />
      )}

      {/* Preview */}
      <div className="preview">
        <div className="prev-row"><span className="dim">Est. price</span><span className="num">{price(estPrice)}</span></div>
        <div className="prev-row"><span className="dim">Value</span><span className="num">₹ {price(estValue)}</span></div>
        <div className="prev-row"><span className="dim">Charges</span><span className="num">₹ {estCharges.toFixed(2)}</span></div>
      </div>

      <RiskMeter />

      <button className={side === 'BUY' ? 'submit buy' : 'submit sell'} disabled={submitting} onClick={submit}>
        {submitting ? 'Placing…' : `${side} ${inst.symbol}`}
      </button>

      <style jsx>{`
        .side-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--panel-2); padding: 4px; border-radius: var(--r); }
        .side-btn { padding: 8px; font-size: 12px; font-weight: 600; border-radius: 4px; color: var(--text-dim); letter-spacing: 0.03em; text-transform: uppercase; }
        .side-btn.buy.on { background: var(--gain); color: #fff; }
        .side-btn.sell.on { background: var(--loss); color: #fff; }
        .row-lbl { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; font-weight: 500; }
        .seg-row { display: flex; gap: 4px; background: var(--panel-2); padding: 3px; border-radius: var(--r); }
        .seg { flex: 1; padding: 6px; font-size: 11px; font-weight: 500; color: var(--text-dim); border-radius: 4px; }
        .seg:hover { color: var(--text); }
        .seg.on { background: var(--panel); color: var(--text); box-shadow: var(--shadow-sm); }
        .preview { padding: 10px 12px; background: var(--panel-2); border: 1px solid var(--line-soft); border-radius: var(--r); }
        .prev-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
        .submit { padding: 12px; border-radius: var(--r); font-size: 13px; font-weight: 600; color: #fff; text-transform: uppercase; letter-spacing: 0.03em; margin-top: 4px; transition: background 0.1s; }
        .submit.buy { background: var(--gain); }
        .submit.buy:hover { background: #0F9F5D; }
        .submit.sell { background: var(--loss); }
        .submit.sell:hover { background: #D53324; }
      `}</style>
    </div>
  );
}
