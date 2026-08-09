'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { useQuotes } from '@/lib/quote-store';
import { price, pct, signClass } from '@/lib/format';

const INDEX_KEYS = ['NSE_INDEX|Nifty 50', 'NSE_INDEX|Nifty Bank'];

const DEMO_NOTIFICATIONS = [
  { id: '1', title: 'Challenge active', body: 'Your evaluation is in progress.', at: 'Today' },
  { id: '2', title: 'Market snapshot', body: 'Last closes loaded — live feed resumes at open.', at: '1h ago' },
];

/** Slim top utility bar — markets + notifications. */
export function AppTopbar({
  userName: _userName,
}: {
  userName?: string;
}) {
  void _userName;
  const subscribe = useQuotes((s) => s.subscribe);
  const nifty = useQuotes((s) => s.quotes['NSE_INDEX|Nifty 50']);
  const bnifty = useQuotes((s) => s.quotes['NSE_INDEX|Nifty Bank']);
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    subscribe(INDEX_KEYS);
  }, [subscribe]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  return (
    <header className="tb">
      <div className="tb-row">
        <div className="tb-markets" aria-label="Market indices">
          <Ticker label="NIFTY 50" shortLabel="NIFTY" q={nifty} />
          <span className="tb-sep" aria-hidden />
          <Ticker label="BANKNIFTY" shortLabel="BANKNIFTY" q={bnifty} />
        </div>

        <div className="tb-right" ref={panelRef}>
          <button
            className="tb-icon"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Icon.Bell size={16} />
            <span className="tb-dot" aria-hidden />
          </button>
          {notifOpen && (
            <div className="tb-notif" role="dialog" aria-label="Notifications">
              <div className="tb-notif-head">Notifications</div>
              {DEMO_NOTIFICATIONS.map((n) => (
                <div key={n.id} className="tb-notif-item">
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <em>{n.at}</em>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .tb {
          background: var(--panel);
          border-bottom: 1px solid var(--line);
          position: sticky; top: 0; z-index: 30;
        }
        .tb-row {
          display: flex; align-items: center; gap: 12px;
          padding: 0 20px; min-height: 56px;
        }
        .tb-markets {
          display: flex; align-items: center; gap: 16px;
          flex: 1; min-width: 0;
        }
        .tb-sep { width: 1px; height: 16px; background: var(--line); flex-shrink: 0; }
        .tb-right {
          display: flex; align-items: center; gap: 4px;
          flex-shrink: 0; margin-left: auto; position: relative;
        }
        .tb-icon {
          position: relative; display: grid; place-items: center;
          width: 40px; height: 40px; color: var(--text-dim); border-radius: var(--r);
        }
        .tb-icon:hover { color: var(--text); background: var(--panel-2); }
        .tb-dot {
          position: absolute; top: 10px; right: 11px; width: 6px; height: 6px;
          border-radius: 50%; background: var(--loss);
        }
        .tb-notif {
          position: absolute; top: calc(100% + 6px); right: 0; width: 280px;
          background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
          box-shadow: var(--shadow-md); z-index: 40; overflow: hidden;
        }
        .tb-notif-head {
          padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-dim); border-bottom: 1px solid var(--line-soft);
        }
        .tb-notif-item {
          display: flex; flex-direction: column; gap: 2px; padding: 12px 14px;
          border-bottom: 1px solid var(--line-soft); font-size: 12px;
        }
        .tb-notif-item strong { font-weight: 600; color: var(--text); }
        .tb-notif-item span { color: var(--text-dim); line-height: 1.35; }
        .tb-notif-item em { font-style: normal; font-size: 10px; color: var(--text-faint); margin-top: 2px; }

        @media (max-width: 900px) {
          .tb-row { padding: 0 12px; gap: 8px; }
        }
        @media (max-width: 640px) {
          .tb-row { padding: 0 10px; min-height: 48px; gap: 6px; }
          .tb-markets { gap: 8px; }
          .tb-sep { height: 22px; }
          .tb-icon { width: 36px; height: 36px; }
          .tb-notif { width: min(280px, calc(100vw - 24px)); }
        }
      `}</style>
    </header>
  );
}

function Ticker({
  label,
  shortLabel,
  q,
}: {
  label: string;
  shortLabel: string;
  q?: import('@/lib/types').Quote;
}) {
  const ltp = q?.ltp;
  const change = q?.change ?? 0;
  const changePct = q?.changePct ?? 0;
  const cls = signClass(change);
  return (
    <div className="tk">
      <span className="tk-label tk-label-full">{label}</span>
      <span className="tk-label tk-label-short">{shortLabel}</span>
      <span className="tk-ltp num">{ltp != null ? price(ltp) : '—'}</span>
      <span className={`tk-chg num ${cls}`}>
        <span className="tk-chg-abs">{q ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} ` : ''}</span>
        <span className="tk-chg-pct">{q ? `(${pct(changePct, false)})` : '—'}</span>
      </span>
      <style jsx>{`
        .tk {
          display: flex; align-items: baseline; gap: 8px;
          font-size: 12px; white-space: nowrap; min-width: 0;
        }
        .tk-label { color: var(--text-dim); font-weight: 600; letter-spacing: 0.04em; font-size: 11px; }
        .tk-label-short { display: none; }
        .tk-ltp { font-weight: 500; color: var(--text); }
        .tk-chg { font-size: 11px; }
        @media (max-width: 640px) {
          .tk {
            flex: 1 1 0; min-width: 0;
            flex-direction: column; align-items: flex-start; gap: 1px;
            white-space: normal;
          }
          .tk-label-full { display: none; }
          .tk-label-short { display: inline; font-size: 10px; }
          .tk-ltp { font-size: 12px; line-height: 1.2; }
          .tk-chg { font-size: 10px; }
          .tk-chg-abs { display: none; }
        }
      `}</style>
    </div>
  );
}
