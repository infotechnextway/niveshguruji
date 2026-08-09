'use client';
import { useEffect, useId, useState } from 'react';
import type { ChallengeProgress, Instrument, Side } from '@/lib/types';
import { useQuotes } from '@/lib/quote-store';
import { price } from '@/lib/format';
import { Icon } from '@/components/Icons';
import { api, ApiError } from '@/lib/api';
import { getSession } from '@/lib/auth';

type UiProduct = 'MIS' | 'CNC' | 'NRML';
type UiOrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';

function toApiProduct(p: UiProduct): 'INTRADAY' | 'CARRY_FORWARD' {
  return p === 'MIS' ? 'INTRADAY' : 'CARRY_FORWARD';
}

function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

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
  const [product, setProduct] = useState<UiProduct>('MIS');
  const [orderType, setOrderType] = useState<UiOrderType>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [target, setTarget] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<string | null>(null);
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
    setErr('');
  }, [open, instrument?.instrumentKey, initialSide]);

  useEffect(() => {
    if (!open) return;
    setChallengeId(null);
    setChallengeStatus(null);
    if (!getSession()) return;
    void api<{ challenge: ChallengeProgress | null }>('/challenge/current')
      .then((res) => {
        setChallengeId(res.challenge?.id ?? null);
        setChallengeStatus(res.challenge?.status ?? null);
      })
      .catch(() => {
        setChallengeId(null);
        setChallengeStatus(null);
      });
  }, [open]);

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
    setErr('');
    try {
      if (!getSession()) {
        throw new Error('Sign in with a trader account to place orders. Demo mode cannot trade.');
      }
      if (!challengeId) {
        throw new Error('No active challenge — activate a plan before trading.');
      }
      if (challengeStatus && !['PENDING', 'ACTIVE'].includes(challengeStatus)) {
        throw new Error(`Challenge is ${challengeStatus} — trading is not allowed.`);
      }

      const apiType: 'MARKET' | 'LIMIT' =
        orderType === 'LIMIT' || orderType === 'SL' ? 'LIMIT' : 'MARKET';

      let limitPricePaise: number | undefined;
      if (apiType === 'LIMIT') {
        const px = Number(limitPrice);
        if (!Number.isFinite(px) || px <= 0) {
          throw new Error('Enter a valid limit price.');
        }
        limitPricePaise = rupeesToPaise(px);
      }

      let trigger: { kind: 'STOP_LOSS' | 'TARGET'; pricePaise: number } | undefined;
      if (needsTrigger) {
        const tpx = Number(triggerPrice);
        if (!Number.isFinite(tpx) || tpx <= 0) {
          throw new Error('Enter a valid trigger price.');
        }
        trigger = { kind: 'STOP_LOSS', pricePaise: rupeesToPaise(tpx) };
      } else if (stopLoss.trim()) {
        const tpx = Number(stopLoss);
        if (!Number.isFinite(tpx) || tpx <= 0) {
          throw new Error('Enter a valid stop-loss price.');
        }
        trigger = { kind: 'STOP_LOSS', pricePaise: rupeesToPaise(tpx) };
      } else if (target.trim()) {
        const tpx = Number(target);
        if (!Number.isFinite(tpx) || tpx <= 0) {
          throw new Error('Enter a valid target price.');
        }
        trigger = { kind: 'TARGET', pricePaise: rupeesToPaise(tpx) };
      }

      const result = await api<{ orderId: string; status: string; filledPricePaise?: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          challengeId,
          instrumentKey: instrument!.instrumentKey,
          side,
          type: apiType,
          product: toApiProduct(product),
          qty,
          ...(limitPricePaise != null ? { limitPricePaise } : {}),
          ...(trigger ? { trigger } : {}),
        }),
      });

      const pxLabel =
        result.filledPricePaise != null
          ? price(result.filledPricePaise / 100)
          : apiType === 'MARKET'
            ? 'market'
            : price(Number(limitPrice) || q?.ltp || 0);
      onPlaced(`${side} ${qty} ${instrument!.symbol} @ ${pxLabel} · ${result.status}`);
      onClose();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr(e instanceof Error ? e.message : 'Order failed');
      }
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

        {err && <div className="om-err" role="alert">{err}</div>}

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
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
          animation: omFade 0.15s ease;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes omFade { from { opacity: 0; } to { opacity: 1; } }
        .om-panel {
          width: 100%;
          max-width: 420px;
          max-height: min(640px, calc(100dvh - 32px));
          overflow-x: hidden;
          overflow-y: auto;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px 16px;
          box-shadow: var(--shadow-lg);
          color: var(--text);
          animation: omUp 0.18s ease;
          box-sizing: border-box;
          min-width: 0;
        }
        @keyframes omUp { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
        .om-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; min-width: 0; }
        .om-head > div { min-width: 0; flex: 1; }
        .om-sym { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; }
        .om-meta { margin: 4px 0 0; font-size: 12px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .om-x {
          width: 32px; height: 32px; border-radius: 8px; border: none; flex-shrink: 0;
          background: var(--panel-2); color: var(--text-dim); display: grid; place-items: center; cursor: pointer;
        }
        .om-x:hover { color: var(--text); }
        .om-side { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .om-side button {
          padding: 10px; border-radius: 8px; border: 1px solid var(--line);
          background: var(--panel-2); color: var(--text-dim); font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .om-side .buy.on { background: color-mix(in srgb, var(--gain) 14%, transparent); border-color: var(--gain); color: var(--gain); }
        .om-side .sell.on { background: color-mix(in srgb, var(--loss) 14%, transparent); border-color: var(--loss); color: var(--loss); }
        .om-field {
          display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;
          font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em;
          min-width: 0;
        }
        .om-field em { font-style: normal; text-transform: none; letter-spacing: 0; opacity: 0.7; }
        .om-field input {
          width: 100%; box-sizing: border-box;
          background: var(--bg); border: 1px solid var(--line); border-radius: 8px;
          padding: 10px 12px; color: var(--text); font-size: 14px; font-family: var(--mono), ui-monospace, monospace;
        }
        .om-field input:focus { outline: none; border-color: var(--accent); }
        .om-seg {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          width: 100%;
        }
        .om-seg.wrap {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .om-seg button {
          min-width: 0; padding: 8px 4px; border-radius: 6px; border: 1px solid var(--line);
          background: var(--panel-2); color: var(--text-dim); font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: inherit; white-space: nowrap;
        }
        .om-seg button.on { background: var(--panel); color: var(--text); border-color: var(--line); box-shadow: var(--shadow-sm); }
        .om-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          min-width: 0;
        }
        .om-row .om-field { margin-bottom: 12px; }
        .om-err {
          margin-bottom: 12px; padding: 8px 12px; border-radius: 8px;
          background: var(--loss-soft); color: var(--loss); font-size: 12px; line-height: 1.4;
        }
        .om-actions { display: flex; gap: 10px; margin-top: 4px; min-width: 0; }
        .om-cancel {
          flex: 1; min-width: 0; padding: 12px; border-radius: 8px; border: 1px solid var(--line);
          background: transparent; color: var(--text-dim); font-weight: 500; cursor: pointer; font-family: inherit;
        }
        .om-place {
          flex: 1.4; min-width: 0; padding: 12px; border-radius: 8px; border: none;
          font-weight: 600; cursor: pointer; font-family: inherit; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .om-place.buy { background: var(--gain); }
        .om-place.sell { background: var(--loss); }
        .om-place:disabled { opacity: 0.6; cursor: wait; }

        @media (max-width: 420px) {
          .om-root { padding: 10px; align-items: flex-end; }
          .om-panel {
            max-width: none;
            max-height: calc(100dvh - 12px - env(safe-area-inset-bottom, 0px));
            border-radius: 14px 14px 10px 10px;
            padding: 16px 14px calc(14px + env(safe-area-inset-bottom, 0px));
          }
          .om-row { grid-template-columns: 1fr; gap: 0; }
          .om-field span { white-space: normal; }
          .om-actions { flex-direction: column-reverse; }
          .om-cancel, .om-place { flex: none; width: 100%; }
        }
      `}</style>
    </div>
  );
}
