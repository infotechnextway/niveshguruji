'use client';
import { paise } from '@/lib/format';
import type { ReactNode } from 'react';

/** Institutional-style key metric card. Big thin number, small label below,
 *  optional delta strip, optional supporting icon. */
export function StatCard({ label, value, delta, icon, footer, format = 'paise' }: {
  label: string;
  value: number; // paise when format='paise', raw number otherwise
  delta?: { paise: number; pct: number };
  icon?: ReactNode;
  footer?: ReactNode;
  format?: 'paise' | 'number';
}) {
  const deltaClass = delta ? (delta.paise > 0 ? 'gain' : delta.paise < 0 ? 'loss' : 'dim') : '';
  const deltaSign = delta && delta.paise > 0 ? '+' : '';
  const display = format === 'number' ? String(value) : paise(value);
  return (
    <div className="sc card">
      <div className="sc-head">
        <span className="sc-label">{label}</span>
        {icon && <span className="sc-icon">{icon}</span>}
      </div>
      <div className="sc-value num">{display}</div>
      {delta && (
        <div className={`sc-delta ${deltaClass}`}>
          <span className="num">{deltaSign}{paise(Math.abs(delta.paise))}</span>
          <span className="num sc-delta-pct">{deltaSign}{delta.pct.toFixed(2)}%</span>
        </div>
      )}
      {footer && <div className="sc-footer">{footer}</div>}
      <style jsx>{`
        .sc { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; }
        .sc-head { display: flex; justify-content: space-between; align-items: center; }
        .sc-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
        .sc-icon { color: var(--text-faint); }
        .sc-value { font-size: 26px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.15; color: var(--text); }
        .sc-delta { display: flex; align-items: baseline; gap: 8px; font-size: 12px; }
        .sc-delta-pct { font-size: 11px; opacity: 0.7; }
        .sc-footer { padding-top: 8px; border-top: 1px solid var(--line-soft); font-size: 11px; color: var(--text-dim); }
      `}</style>
    </div>
  );
}
