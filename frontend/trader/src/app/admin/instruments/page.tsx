'use client';
import { useCallback, useEffect, useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Icon } from '@/components/Icons';
import { api } from '@/lib/api';

interface AdminInstrument {
  instrumentKey: string;
  symbol: string;
  name: string;
  segment: string;
  exchange?: string;
  enabled: boolean;
  lotSize?: number;
}

export default function InstrumentsPage() {
  const [seg, setSeg] = useState<'ALL' | 'EQ' | 'INDEX' | 'FO' | 'CUR'>('ALL');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AdminInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingDhan, setSyncingDhan] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (seg !== 'ALL') qs.set('segment', seg);
      if (query.trim()) qs.set('q', query.trim());
      const data = await api<AdminInstrument[]>(`/admin/instruments?${qs}`);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, [seg, query]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function sync() {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const result = await api<{ downloaded: number; mapped: number; upserted: number; skipped: number }>(
        '/admin/instruments/sync',
        { method: 'POST' },
      );
      setMessage(`Upstox: synced ${result.mapped.toLocaleString()} instruments (skipped ${result.skipped.toLocaleString()}).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function syncDhan() {
    setSyncingDhan(true);
    setMessage('');
    setError('');
    try {
      const result = await api<{ downloaded: number; mapped: number; upserted: number; skipped: number }>(
        '/admin/instruments/sync/dhan',
        { method: 'POST' },
      );
      setMessage(`Dhan: synced ${result.mapped.toLocaleString()} instruments (skipped ${result.skipped.toLocaleString()}).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dhan sync failed');
    } finally {
      setSyncingDhan(false);
    }
  }

  async function toggle(row: AdminInstrument) {
    try {
      await api(`/admin/instruments/${encodeURIComponent(row.instrumentKey)}/enabled`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      setRows((prev) => prev.map((r) => (
        r.instrumentKey === row.instrumentKey ? { ...r, enabled: !r.enabled } : r
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  return (
    <>
      <AdminTopbar
        title="Instruments"
        subtitle="Sync from Upstox or Dhan master — toggle tradeable symbols."
        actions={
          <>
            <button className="btn btn-secondary" type="button" disabled={syncing || syncingDhan} onClick={() => void sync()}>
              {syncing ? 'Syncing…' : 'Sync from Upstox'}
            </button>
            <button className="btn btn-secondary" type="button" disabled={syncing || syncingDhan} onClick={() => void syncDhan()}>
              {syncingDhan ? 'Syncing…' : 'Sync from Dhan'}
            </button>
          </>
        }
      />
      <div className="admin-body">
        {message && <div className="note ok">{message}</div>}
        {error && <div className="note err">{error}</div>}
        <div className="hstack gap-2" style={{ marginBottom: 16 }}>
          <div className="hstack" style={{ background: 'var(--panel-2)', padding: 4, borderRadius: 'var(--r)' }}>
            {(['ALL', 'EQ', 'INDEX', 'FO', 'CUR'] as const).map((s) => (
              <button key={s} type="button" className={`seg ${seg === s ? 'on' : ''}`} onClick={() => setSeg(s)}>{s}</button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: 300 }}>
            <span style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-faint)' }}><Icon.Search size={14}/></span>
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search symbol or name…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="card-lg" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th><th>Name</th><th>Segment</th><th>Instrument key</th><th className="r">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="dim" style={{ padding: 16 }}>Loading…</td></tr>
              )}
              {!loading && rows.map((i) => (
                <tr key={i.instrumentKey}>
                  <td><span style={{ fontWeight: 500 }}>{i.symbol}</span></td>
                  <td className="dim">{i.name}</td>
                  <td><span className="badge badge-neutral">{i.segment}</span></td>
                  <td><code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{i.instrumentKey}</code></td>
                  <td className="r">
                    <button type="button" className={`badge ${i.enabled ? 'badge-success' : 'badge-neutral'}`} onClick={() => void toggle(i)}>
                      {i.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={5} className="dim" style={{ padding: 16 }}>No instruments — run Sync from Upstox or Sync from Dhan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        .seg { padding: 6px 12px; font-size: 11px; color: var(--text-dim); border-radius: 4px; font-weight: 500; background: transparent; border: none; cursor: pointer; }
        .seg:hover { color: var(--text); }
        .seg.on { background: var(--panel); color: var(--text); box-shadow: var(--shadow-sm); }
        .note { margin-bottom: 12px; padding: 10px 14px; border-radius: var(--r); font-size: 12px; border: 1px solid var(--line); }
        .note.ok { border-left: 3px solid var(--gain); }
        .note.err { border-left: 3px solid var(--loss); color: var(--loss); }
        .badge { cursor: pointer; border: none; font-family: inherit; }
      `}</style>
    </>
  );
}
