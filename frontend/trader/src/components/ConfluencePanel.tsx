'use client';
import type { ConfluenceSettings, MtfRow } from '@/lib/market/indicators';

const TOGGLES: { key: keyof ConfluenceSettings; label: string }[] = [
  { key: 'enabled', label: 'Confluence' },
  { key: 'showEMA', label: '9/15 EMA' },
  { key: 'showSweep', label: 'Liquidity Sweep' },
  { key: 'showTrend', label: 'Trendline' },
  { key: 'showGolden', label: 'Golden Trio' },
  { key: 'showFib', label: 'Fibonacci' },
  { key: 'showMTF', label: 'MTF Panel' },
  { key: 'showSignals', label: 'Strong Signals' },
];

interface Props {
  settings: ConfluenceSettings;
  onChange: (patch: Partial<ConfluenceSettings>) => void;
  mtf: MtfRow[];
  bullScore: number;
  bearScore: number;
  strongSignal: 'buy' | 'sell' | null;
  open: boolean;
  onToggleOpen: () => void;
}

export function ConfluencePanel({
  settings, onChange, mtf, bullScore, bearScore, strongSignal, open, onToggleOpen,
}: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        title="Multi-Strategy Confluence settings"
        style={{
          color: settings.enabled ? 'var(--text)' : 'var(--text-faint)',
          fontWeight: settings.enabled ? 600 : 400,
          background: settings.enabled ? 'var(--surface-2, rgba(255,255,255,0.06))' : 'transparent',
          border: '1px solid var(--line-soft)',
          borderRadius: 4,
          cursor: 'pointer',
          padding: '2px 8px',
          fontSize: 10,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: 'inherit',
        }}
      >
        Confluence
        {strongSignal === 'buy' && (
          <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 700 }}>BUY</span>
        )}
        {strongSignal === 'sell' && (
          <span style={{ marginLeft: 6, color: '#dc2626', fontWeight: 700 }}>SELL</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 36, right: 8, zIndex: 20,
          background: 'var(--surface, #1a1a2e)', border: '1px solid var(--line-soft)',
          borderRadius: 8, padding: '10px 12px', minWidth: 220,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)', fontSize: 11,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)' }}>
            Multi-Strategy Confluence
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {TOGGLES.map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={(e) => onChange({ [key]: e.target.checked })}
                  style={{ accentColor: '#3b82f6' }}
                />
                {label}
              </label>
            ))}
          </div>

          <div style={{
            display: 'flex', gap: 12, marginBottom: 10, fontSize: 10,
            padding: '6px 8px', borderRadius: 4,
            background: strongSignal === 'buy' ? 'rgba(22,163,74,0.15)'
              : strongSignal === 'sell' ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.04)',
          }}>
            <span>Bull: <strong style={{ color: '#16a34a' }}>{bullScore}</strong></span>
            <span>Bear: <strong style={{ color: '#dc2626' }}>{bearScore}</strong></span>
            {strongSignal && (
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: strongSignal === 'buy' ? '#16a34a' : '#dc2626' }}>
                STRONG {strongSignal === 'buy' ? 'BUY' : 'SELL'}
              </span>
            )}
          </div>

          {settings.showMTF && mtf.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ color: 'var(--text-faint)', textAlign: 'left' }}>
                  <th style={{ padding: '2px 4px' }}>TF</th>
                  <th style={{ padding: '2px 4px' }}>EMA9</th>
                  <th style={{ padding: '2px 4px' }}>EMA15</th>
                  <th style={{ padding: '2px 4px' }}>Bias</th>
                </tr>
              </thead>
              <tbody>
                {mtf.map((row) => (
                  <tr key={row.tf}>
                    <td style={{ padding: '2px 4px' }}>{row.tf}</td>
                    <td style={{ padding: '2px 4px' }}>{Number.isFinite(row.ema9) ? row.ema9.toFixed(2) : '—'}</td>
                    <td style={{ padding: '2px 4px' }}>{Number.isFinite(row.ema15) ? row.ema15.toFixed(2) : '—'}</td>
                    <td style={{
                      padding: '2px 4px', fontWeight: 600,
                      color: row.bias === 'Bull' ? '#16a34a' : row.bias === 'Bear' ? '#dc2626' : 'var(--text-faint)',
                    }}>
                      {row.bias}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
