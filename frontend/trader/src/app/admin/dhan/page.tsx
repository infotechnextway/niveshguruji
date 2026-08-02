'use client';
import { useCallback, useEffect, useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { api } from '@/lib/api';

type FeedMode = 'simulator' | 'upstox' | 'angel' | 'dhan';

interface DhanStatus {
  provider: 'dhan';
  feedMode: FeedMode;
  clientId: string | null;
  accessTokenSet: boolean;
  accessTokenPreview: string | null;
  source: 'database' | 'environment' | 'mixed' | 'none';
  updatedAt: string | null;
  updatedBy: string | null;
}
export default function DhanSetupPage() {
  const [status, setStatus] = useState<DhanStatus | null>(null);
  const [feedMode, setFeedMode] = useState<FeedMode>('simulator');
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [pin, setPin] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<DhanStatus>('/admin/integrations/dhan');
      setStatus(data);
      setFeedMode(data.feedMode);
      if (data.clientId) setClientId(data.clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Dhan settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const body: Record<string, unknown> = {};
      if (clientId.trim()) body.clientId = clientId.trim();
      if (accessToken.trim()) body.accessToken = accessToken.trim();

      const creds = await api<DhanStatus>('/admin/integrations/dhan', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      const modeRes = await api<{ feedMode: FeedMode }>('/admin/integrations/feed-mode', {
        method: 'PUT',
        body: JSON.stringify({ feedMode }),
      });

      setStatus({ ...creds, feedMode: modeRes.feedMode });
      setAccessToken('');
      setMessage('Saved. Engine and API will pick up changes within seconds.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function generateToken() {
    setGenerating(true);
    setMessage('');
    setError('');
    try {
      const result = await api<{
        ok: boolean;
        message: string;
        accessToken?: string;
        expiryTime?: string;
        dhanClientName?: string;
      }>('/admin/integrations/dhan/generate-token', {
        method: 'POST',
        body: JSON.stringify({ clientId: clientId.trim(), pin, totp }),
      });

      if (result.ok) {
        setPin('');
        setTotp('');
        if (result.accessToken) setAccessToken(result.accessToken);
        await load();
        const name = result.dhanClientName ? ` (${result.dhanClientName})` : '';
        const expiry = result.expiryTime
          ? ` Expires ${new Date(result.expiryTime).toLocaleString()}.`
          : '';
        setMessage(`${result.message}${name}${expiry}`);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const result = await api<{ ok: boolean; message: string }>('/admin/integrations/dhan/test', {
        method: 'POST',
        body: '{}',
      });
      if (result.ok) setMessage(result.message);
      else setError(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  async function syncTokens() {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const result = await api<{ matched: number; updated: number; downloaded: number }>(
        '/admin/integrations/dhan/sync-tokens',
        { method: 'POST', body: '{}' },
      );
      setMessage(`Token sync done — matched ${result.matched}, updated ${result.updated} of ${result.downloaded} Dhan scrips.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <AdminTopbar
        title="Dhan API"
        subtitle="Live credentials, feed mode, and instrument security ID mapping."
        actions={
          <>
            <button type="button" className="btn btn-secondary" disabled={syncing || loading} onClick={() => void syncTokens()}>
              {syncing ? 'Syncing…' : 'Sync tokens'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={testing || loading} onClick={() => void testConnection()}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          </>
        }
      />
      <div className="admin-body">
        {message && <div className="banner ok">{message}</div>}
        {error && <div className="banner err">{error}</div>}

        <div className="grid">
          <section className="card-lg panel">
            <h3>Feed mode</h3>
            <p className="dim">Shared across all providers — simulator or any configured live feed.</p>
            <div className="seg">
              <button type="button" className={feedMode === 'simulator' ? 'on' : ''} onClick={() => setFeedMode('simulator')}>
                Simulator
              </button>
              <button type="button" className={feedMode === 'upstox' ? 'on' : ''} onClick={() => setFeedMode('upstox')}>
                Upstox live
              </button>
              <button type="button" className={feedMode === 'angel' ? 'on' : ''} onClick={() => setFeedMode('angel')}>
                Angel live
              </button>
              <button type="button" className={feedMode === 'dhan' ? 'on' : ''} onClick={() => setFeedMode('dhan')}>
                Dhan live
              </button>
            </div>
          </section>

          <section className="card-lg panel">
            <h3>Status</h3>
            {loading || !status ? (
              <p className="dim">Loading…</p>
            ) : (
              <dl className="status">
                <div><dt>Active mode</dt><dd><code>{status.feedMode}</code></dd></div>
                <div><dt>Client ID</dt><dd>{status.clientId ?? 'Not set'}</dd></div>
                <div><dt>Access token</dt><dd>{status.accessTokenSet ? status.accessTokenPreview : 'Not set'}</dd></div>
                <div><dt>Source</dt><dd><code>{status.source}</code></dd></div>
                <div><dt>Updated</dt><dd className="dim">{status.updatedAt ? new Date(status.updatedAt).toLocaleString() : '—'}</dd></div>
              </dl>
            )}
          </section>
        </div>

        <section className="card-lg panel form">
          <h3>Credentials</h3>
          <p className="dim">
            Stored encrypted in Mongo (`DATA_ENC_SECRET`). Leave a field blank to keep the current value.
          </p>

          <div className="row2">
            <label>
              <span>Client ID</span>
              <input
                className="input"
                autoComplete="username"
                placeholder="Dhan client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </label>
            <label>
              <span>Access token</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder={status?.accessTokenSet ? '•••• saved — leave blank to keep' : 'JWT access token from Dhan'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </label>
          </div>

          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={saving || loading} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </section>

        <section className="card-lg panel form">
          <h3>Generate access token (TOTP)</h3>
          <p className="dim">
            Uses Dhan auth API with your client ID, trading PIN, and authenticator code. Token is saved encrypted on success.
          </p>
          <div className="row2">
            <label>
              <span>Client ID</span>
              <input
                className="input"
                autoComplete="username"
                placeholder="Dhan client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </label>
            <label>
              <span>PIN</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                placeholder="Trading PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </label>
          </div>
          <label>
            <span>TOTP</span>
            <input
              className="input"
              autoComplete="off"
              placeholder="6-digit code"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          </label>
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={generating || !clientId.trim() || !pin || !totp}
              onClick={() => void generateToken()}
            >
              {generating ? 'Generating…' : 'Generate token'}
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .banner { margin-bottom: 16px; padding: 10px 14px; border-radius: var(--r); font-size: 12px; border: 1px solid var(--line); }
        .banner.ok { background: color-mix(in srgb, var(--gain) 10%, var(--panel)); color: var(--text); }
        .banner.err { background: color-mix(in srgb, var(--loss) 10%, var(--panel)); color: var(--loss); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .panel { padding: 20px; }
        .panel h3 { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
        .panel .dim { font-size: 12px; margin: 0 0 16px; line-height: 1.45; }
        .seg { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 4px; background: var(--panel-2); border-radius: var(--r); }
        .seg button { padding: 8px 14px; font-size: 12px; border-radius: 4px; color: var(--text-dim); background: transparent; border: none; cursor: pointer; font-family: inherit; }
        .seg button.on { background: var(--panel); color: var(--text); box-shadow: var(--shadow-sm); font-weight: 500; }
        .status { display: grid; gap: 10px; margin: 0; }
        .status > div { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
        .status dt { color: var(--text-faint); }
        .status dd { margin: 0; font-family: var(--mono); }
        .form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
        .form label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-dim); }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .actions { display: flex; gap: 10px; margin-top: 4px; }
        @media (max-width: 900px) {
          .grid, .row2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
