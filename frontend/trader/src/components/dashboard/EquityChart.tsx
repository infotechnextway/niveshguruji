'use client';
import { useEffect, useRef } from 'react';
import { paise } from '@/lib/format';
import { useTheme } from '@/lib/theme';

/** A lightweight SVG area chart of equity over the challenge lifetime. No
 *  library — just a hand-drawn path so it looks precisely as designed. */
export function EquityChart({ series, capital }: { series: { t: number; v: number }[]; capital: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [w, setW] = [0, 320];

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => el.style.setProperty('--w', String(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = 720, height = 220, pad = { l: 60, r: 20, t: 20, b: 30 };
  const xs = series.map((_, i) => pad.l + (i / (series.length - 1 || 1)) * (width - pad.l - pad.r));
  const values = series.map((p) => p.v);
  const min = Math.min(capital * 0.95, ...values);
  const max = Math.max(capital * 1.05, ...values);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${y(values[i])}`).join(' ');
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${height - pad.b} L ${xs[0]} ${height - pad.b} Z`;
  const last = values[values.length - 1] ?? capital;
  const cls = last >= capital ? 'gain' : 'loss';
  const stroke = last >= capital ? 'var(--gain)' : 'var(--loss)';
  const fillId = `eqfill-${theme}`;
  const capY = y(capital);

  const yTicks = [min, (min + max) / 2, max];

  return (
    <div className="ec card-lg" ref={ref}>
      <div className="ec-head">
        <div className="vstack gap-1">
          <span className="ec-label">Equity curve · Last 30 days</span>
          <span className={`ec-value num ${cls}`}>{paise(last)}</span>
        </div>
        <div className="hstack gap-3 ec-legend">
          <span className="ec-legend-item"><span className="dot" style={{ background: stroke }} /> Equity</span>
          <span className="ec-legend-item"><span className="dash" /> Starting capital</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: 220 }}>
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.20"/>
            <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2 4"/>
            <text x={pad.l - 10} y={y(v) + 4} fontSize="10" fill="var(--text-faint)" textAnchor="end">
              {paise(Math.round(v), { decimals: false }).replace('₹', '')}
            </text>
          </g>
        ))}
        {/* Starting-capital reference line */}
        <line x1={pad.l} x2={width - pad.r} y1={capY} y2={capY} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="4 4"/>
        <path d={areaPath} fill={`url(#${fillId})`} />
        <path d={linePath} stroke={stroke} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <style jsx>{`
        .ec { padding: 20px; }
        .ec-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .ec-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; }
        .ec-value { font-size: 22px; font-weight: 400; letter-spacing: -0.02em; }
        .ec-legend { font-size: 11px; color: var(--text-dim); }
        .ec-legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .ec-legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
        .ec-legend-item .dash { display: inline-block; width: 12px; height: 1px; background: var(--text-faint);
          border-top: 1px dashed var(--text-faint); background: transparent; }
      `}</style>
    </div>
  );
}
