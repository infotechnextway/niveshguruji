'use client';
import { useEffect, useId, useState } from 'react';
import type { Instrument, Side } from '@/lib/types';
import { useQuotes } from '@/lib/quote-store';
import { price } from '@/lib/format';
import { Icon } from '@/components/Icons';

type Product = 'MIS' | 'CNC' | 'NRML';
type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

export function OrderModal({
  open,
  instrument,
  initialSide,
  onClose,
  onPlaced,
}: {
  open: boolean;
  instrument: Instrument | null;
  initialSide: Side;
  onClose: () => void;
  onPlaced: (msg: string) => void;
}) {
  const titleId = useId();
  const [side, setSide] = useState<Side>(initialSide);
  const [qty, setQty] = useState(1);
  const [product, setProduct] = useState<Product>('MIS');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [target, setTarget] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const q = useQuotes((s) => s.quotes[instrument?.instrumentKey ?? '']);

  useEffect(() => {
    if (!open || !instrument) return;
    setSide(initialSide);
    setQty(Math.max(1, instrument.lotSize || 1));
    setOrderType('MARKET');
    setLimitPrice(q?.ltp ? String(q.ltp) : '');
    setTriggerPrice('');
    setTarget('');
    setStopLoss('');
  }, [open, instrument?.instrumentKey, initialSide]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !instrument) return null;

  const needsPrice = orderType === 'LIMIT' || orderType === 'SL';
  const needsTrigger = orderType === 'SL' || orderType === 'SL-M';

  async function submit() {
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const px = orderType === 'MARKET' || orderType === 'SL-M'
        ? 'market'
        : price(Number(limitPrice) || q?.ltp || 0);
      onPlaced(`${side} ${qty} ${instrument!.symbol} @ ${px}`);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="om-root" role="presentation" onClick={onClose}>
      <div
        className="om-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="om-head">
          <div>
            <h2 id={titleId} className="om-sym">{instrument.symbol}</h2>
            <p className="om-meta">{instrument.exchange} · {instrument.segment} · LTP {q ? price(q.ltp) : '—'}</p>
          </div>
          <button type="button" className="om-x" aria-label="Close" onClick={onClose}>
            <Icon.X size={16} />
          </button>
        </div>

        <div className="om-side">
          <button type="button" className={`buy ${side === 'BUY' ? 'on' : ''}`} onClick={() => setSide('BUY')}>Buy</button>
          <button type="button" className={`sell ${side === 'SELL' ? 'on' : ''}`} onClick={() => setSide('SELL')}>Sell</button>
        </div>

        <label className="om-field">
          <span>Quantity</span>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </label>

        <div className="om-field">
          <span>Product</span>
          <div className="om-seg">
            {(['MIS', 'CNC', 'NRML'] as const).map((p) => (
              <button key={p} type="button" className={product === p ? 'on' : ''} onClick={() => setProduct(p)}>{p}</button>
            ))}
          </div>
        </div>

        <div className="om-field">
          <span>Order type</span>
          <div className="om-seg wrap">
            {(['MARKET', 'LIMIT', 'SL', 'SL-M'] as const).map((t) => (
              <button key={t} type="button" className={orderType === t ? 'on' : ''} onClick={() => setOrderType(t)}>{t}</button>
            ))}
          </div>
        </div>

        {needsPrice && (
          <label className="om-field">
            <span>Price</span>
            <input type="number" step="0.05" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
          </label>
        )}
        {needsTrigger && (
          <label className="om-field">
            <span>Trigger price</span>
            <input type="number" step="0.05" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} />
          </label>
        )}

        <div className="om-row">
          <label className="om-field">
            <span>Target <em>(optional)</em></span>
            <input type="number" step="0.05" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="—" />
          </label>
          <label className="om-field">
            <span>Stop loss <em>(optional)</em></span>
            <input type="number" step="0.05" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="—" />
          </label>
        </div>

        <div className="om-actions">
          <button type="button" className="om-cancel" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`om-place ${side === 'BUY' ? 'buy' : 'sell'}`}
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? 'Placing…' : `Place ${side}`}
          </button>
        </div>
      </div>

      <style jsx>{`
        .om-root {
          position: fixed; inset: 0; z-index: 80;
          background: rgba(15, 17, 20, 0.45);
          display: grid; place-items: center;
          padding: 20px;
          animation: omFade 0.15s ease;
        }
        @keyframes omFade { from { opacity: 0; } to { opacity: 1; } }
        .om-panel {
          width: min(420px, 100%);
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 20px;
          box-shadow: var(--shadow-lg);
          color: var(--text);
          animation: omUp 0.18s ease;
        }
        @keyframes omUp { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
        .om-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .om-sym { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
        .om-meta { margin: 4px 0 0; font-size: 12px; color: var(--text-dim); }
        .om-x {
          width: 32px; height: 32px; border-radius: 8px; border: none;
          background: var(--panel-2); color: var(--text-dim); display: grid; place-items: center; cursor: pointer;
        }
        .om-x:hover { color: var(--text); }
        .om-side { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .om-side button {
          padding: 10px; border-radius: 8px; border: 1px solid var(--line);
          background: var(--panel-2); color: var(--text-dim); font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .om-side .buy.on { background: color-mix(in srgb, var(--gain) 14%, transparent); border-color: var(--gain); color: var(--gain); }
        .om-side .sell.on { background: color-mix(in srgb, var(--loss) 14%, transparent); border-color: var(--loss); color: var(--loss); }
        .om-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }
        .om-field em { font-style: normal; text-transform: none; letter-spacing: 0; opacity: 0.7; }
        .om-field input {
          background: var(--bg); border: 1px solid var(--line); border-radius: 8px;
          padding: 10px 12px; color: var(--text); font-size: 14px; font-family: var(--mono), ui-monospace, monospace;
        }
        .om-field input:focus { outline: none; border-color: var(--accent); }
        .om-seg { display: flex; gap: 6px; }
        .om-seg.wrap { flex-wrap: wrap; }
        .om-seg button {
          flex: 1; min-width: 64px; padding: 8px; border-radius: 6px; border: 1px solid var(--line);
          background: var(--panel-2); color: var(--text-dim); font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
        }
        .om-seg button.on { background: var(--panel); color: var(--text); border-color: var(--line); box-shadow: var(--shadow-sm); }
        .om-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .om-actions { display: flex; gap: 10px; margin-top: 8px; }
        .om-cancel {
          flex: 1; padding: 12px; border-radius: 8px; border: 1px solid var(--line);
          background: transparent; color: var(--text-dim); font-weight: 500; cursor: pointer; font-family: inherit;
        }
        .om-place {
          flex: 1.4; padding: 12px; border-radius: 8px; border: none;
          font-weight: 600; cursor: pointer; font-family: inherit; color: #fff;
        }
        .om-place.buy { background: var(--gain); }
        .om-place.sell { background: var(--loss); }
        .om-place:disabled { opacity: 0.6; cursor: wait; }
      `}</style>
    </div>
  );
}
