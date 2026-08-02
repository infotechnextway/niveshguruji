'use client';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

interface ConfigKey {
  key: string; description: string; value: string; type: 'number' | 'string' | 'boolean' | 'enum';
  group: string;
}

const KEYS: ConfigKey[] = [
  { group: 'Market', key: 'market.window.EQ', description: 'Cash market trading window (HH:MM-HH:MM IST)', value: '09:15-15:30', type: 'string' },
  { group: 'Market', key: 'market.window.CUR', description: 'Currency trading window (HH:MM-HH:MM IST)', value: '09:00-17:00', type: 'string' },
  { group: 'Trading', key: 'trading.squareoff.EQ', description: 'Intraday auto-square-off time for equities (IST)', value: '15:15', type: 'string' },
  { group: 'Trading', key: 'trading.slippage.bps', description: 'Simulated slippage on market orders (basis points)', value: '0', type: 'number' },
  { group: 'Trading', key: 'trading.charges.model', description: 'Charges model applied to fills', value: 'flat+turnoverBps:0', type: 'string' },
  { group: 'Challenge', key: 'challenge.dailyDD.anchor', description: 'Daily drawdown anchor policy', value: 'PREV_DAY_CLOSE', type: 'enum' },
  { group: 'Challenge', key: 'challenge.freezeOnPass', description: 'Freeze trading when a challenge PASSES', value: 'true', type: 'boolean' },
  { group: 'Watchlist', key: 'watchlist.maxSymbolsPerTab', description: 'Maximum symbols per watchlist tab', value: '50', type: 'number' },
  { group: 'Statements', key: 'statements.maxRangeDays', description: 'Max reporting range for user statements (days)', value: '183', type: 'number' },
  { group: 'Feed', key: 'feed.staleAlertSeconds', description: 'Stale-feed alert threshold (seconds)', value: '10', type: 'number' },
];

export default function ConfigPage() {
  const grouped = KEYS.reduce((acc, k) => { (acc[k.group] ||= []).push(k); return acc; }, {} as Record<string, ConfigKey[]>);
  return (
    <>
      <AdminTopbar title="Configuration" subtitle="Runtime config keys. Every change is audited."
        actions={<button className="btn btn-secondary">Export snapshot</button>} />
      <div className="admin-body">
        <div className="vstack gap-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="card-lg" style={{ padding: 0 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 500 }}>{group}</h3>
              </div>
              <table className="table">
                <thead><tr><th>Key</th><th>Description</th><th>Value</th><th></th></tr></thead>
                <tbody>
                  {items.map((k) => (
                    <tr key={k.key}>
                      <td><code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{k.key}</code></td>
                      <td className="dim">{k.description}</td>
                      <td><code style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--panel-2)', padding: '2px 6px', borderRadius: 3 }}>{k.value}</code></td>
                      <td className="r"><button className="btn btn-ghost">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
