'use client';
import { useCallback, useEffect, useState } from 'react';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { api } from '@/lib/api';

type FeedMode = 'simulator' | 'upstox' | 'angel' | 'dhan';

interface AngelStatus {
  provider: 'angel';
  feedMode: FeedMode;
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  clientCode: string | null;
  jwtTokenSet: boolean;
  jwtTokenPreview: string | null;
  feedTokenSet: boolean;
  feedTokenPreview: string | null;
  source: 'database' | 'environment' | 'mixed' | 'none';
  updatedAt: string | null;
  updatedBy: string | null;
}
export default function AngelSetupPage() {
  const [status, setStatus] = useState<AngelStatus | null>(null);
  const [feedMode, setFeedMode] = useState<FeedMode>('simulator');
  const [apiKey, setApiKey] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [feedToken, setFeedToken] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<AngelStatus>('/admin/integrations/angel');
      setStatus(data);
      setFeedMode(data.feedMode);
      if (data.clientCode) setClientCode(data.clientCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Angel settings');
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
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (clientCode.trim()) body.clientCode = clientCode.trim();
      if (jwtToken.trim()) body.jwtToken = jwtToken.trim();
      if (feedToken.trim()) body.feedToken = feedToken.trim();

      const creds = await api<AngelStatus>('/admin/integrations/angel', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      const modeRes = await api<{ feedMode: FeedMode }>('/admin/integrations/feed-mode', {
        method: 'PUT',
        body: JSON.stringify({ feedMode }),
      });

      setStatus({ ...creds, feedMode: modeRes.feedMode });
      setApiKey('');
      setJwtToken('');
      setFeedToken('');
      setMessage('Saved. Engine and API will pick up changes within seconds.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function login() {
    setLoggingIn(true);
    setMessage('');
    setError('');
    try {
      const data = await api<AngelStatus>('/admin/integrations/angel/login', {
        method: 'POST',
        body: JSON.stringify({ password, totp }),
      });
      setStatus(data);
      setPassword('');
      setTotp('');
      setMessage('Login succeeded — JWT and feed token stored.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const result = await api<{ ok: boolean; message: string }>('/admin/integrations/angel/test', {
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
        '/admin/integrations/angel/sync-tokens',
        { method: 'POST', body: '{}' },
      );
      setMessage(`Token sync done — matched ${result.matched}, updated ${result.updated} of ${result.downloaded} Angel scrips.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <AdminTopbar
        title="Angel One API"
        subtitle="Live credentials, feed mode, and instrument token mapping."
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
                <div><dt>Client code</dt><dd>{status.clientCode ?? 'Not set'}</dd></div>
                <div><dt>API key</dt><dd>{status.apiKeySet ? status.apiKeyPreview : 'Not set'}</dd></div>
                <div><dt>JWT</dt><dd>{status.jwtTokenSet ? status.jwtTokenPreview : 'Not set'}</dd></div>
                <div><dt>Feed token</dt><dd>{status.feedTokenSet ? status.feedTokenPreview : 'Not set'}</dd></div>
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
              <span>API key</span>
              <input
                className="input"
                type="password"
                autoComplete="off"
                placeholder={status?.apiKeySet ? '•••• saved — leave blank to keep' : 'Angel SmartAPI private key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <label>
              <span>Client code</span>
              <input
                className="input"
                autoComplete="username"
                placeholder="Trading client code"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
              />
            </label>
          </div>

          <label>
            <span>JWT token</span>
            <input
              className="input"
              type="password"
              autoComplete="off"
              placeholder={status?.jwtTokenSet ? '•••• saved — leave blank to keep' : 'Paste JWT from login'}
              value={jwtToken}
              onChange={(e) => setJwtToken(e.target.value)}
            />
          </label>

          <label>
            <span>Feed token</span>
            <input
              className="input"
              type="password"
              autoComplete="off"
              placeholder={status?.feedTokenSet ? '•••• saved — leave blank to keep' : 'Paste feed token from login'}
              value={feedToken}
              onChange={(e) => setFeedToken(e.target.value)}
            />
          </label>

          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={saving || loading} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </section>

        <section className="card-lg panel form">
          <h3>Login with password + TOTP</h3>
          <p className="dim">Requires API key and client code saved first. Stores returned JWT and feed token.</p>
          <div className="row2">
            <label>
              <span>Password</span>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label>
              <span>TOTP</span>
              <input className="input" autoComplete="off" placeholder="6-digit code" value={totp} onChange={(e) => setTotp(e.target.value)} />
            </label>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-secondary" disabled={loggingIn || !password || !totp} onClick={() => void login()}>
              {loggingIn ? 'Logging in…' : 'Login & store tokens'}
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
