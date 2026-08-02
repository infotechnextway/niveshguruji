'use client';
import { AppShell } from '@/components/AppShell';
import { useTheme } from '@/lib/theme';
import { Icon } from '@/components/Icons';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <AppShell userName="Kapil">
      <main className="main">
        <div className="wrap">
          <h1 className="ph-title">Settings</h1>

          <section className="card-lg">
            <div className="sec-head">
              <h3>Appearance</h3>
              <p className="dim">Choose how RIDGELINE CAPITAL looks to you. The change applies immediately.</p>
            </div>
            <div className="theme-picker">
              {(['light','dark'] as const).map((t) => (
                <button key={t} className={`swatch ${theme === t ? 'on' : ''}`} onClick={() => setTheme(t)}>
                  <div className={`preview preview-${t}`}>
                    <div className="preview-bar"/>
                    <div className="preview-content">
                      <div className="preview-line long"/><div className="preview-line short"/>
                      <div className="preview-card"><div className="preview-num"/></div>
                    </div>
                  </div>
                  <div className="swatch-label">
                    {t === 'light' ? <Icon.Sun size={14}/> : <Icon.Moon size={14}/>}
                    <span>{t === 'light' ? 'Light' : 'Dark'}</span>
                    {theme === t && <span className="badge badge-info" style={{ marginLeft: 'auto' }}>Active</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="card-lg">
            <div className="sec-head">
              <h3>Account</h3>
              <p className="dim">Profile and login information.</p>
            </div>
            <div className="rows">
              <Row label="Full name" value="Kapil" />
              <Row label="Email" value="kapil@example.com" />
              <Row label="Mobile" value="+91 98765 43210" />
              <Row label="Username" value="kapil_trader" />
            </div>
          </section>

          <section className="card-lg">
            <div className="sec-head">
              <h3>Trading</h3>
              <p className="dim">Preferences for order defaults.</p>
            </div>
            <div className="rows">
              <Row label="Default product" value="Intraday" />
              <Row label="Default order type" value="Market" />
              <Row label="Confirmation before placing" value="Enabled" />
            </div>
          </section>

          <section className="card-lg">
            <div className="sec-head"><h3>Security</h3><p className="dim">Sessions and two-factor.</p></div>
            <div className="rows">
              <Row label="Active sessions" value="1 (this device)" />
              <Row label="Two-factor authentication" value="Off" action={<button className="btn btn-primary">Enable</button>} />
            </div>
          </section>
        </div>
      </main>
      <style jsx>{`
        .main { background: var(--bg); }
        .wrap { max-width: 900px; margin: 0 auto; padding: 28px 32px 60px; display: flex; flex-direction: column; gap: 20px; }
        .ph-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; margin-bottom: 8px; }
        .card-lg { padding: 0; overflow: hidden; }
        .sec-head { padding: 20px 24px; border-bottom: 1px solid var(--line-soft); }
        .sec-head h3 { font-size: 14px; font-weight: 500; }
        .sec-head .dim { font-size: 12px; margin-top: 2px; }
        .theme-picker { padding: 20px 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .swatch { border: 1px solid var(--line); border-radius: var(--r-md); padding: 8px; background: var(--panel);
          display: flex; flex-direction: column; gap: 8px; text-align: left; transition: border-color 0.1s; min-height: 44px; }
        .swatch:hover { border-color: var(--line-strong); }
        .swatch.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-ring); }
        .preview { border-radius: var(--r); overflow: hidden; height: 100px; position: relative; }
        .preview-light { background: #F7F8FA; }
        .preview-dark { background: #0A0C10; }
        .preview-bar { height: 12px; background: #12151B; }
        .preview-light .preview-bar { background: #FFFFFF; border-bottom: 1px solid #E4E7EC; }
        .preview-content { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .preview-line { height: 4px; border-radius: 2px; background: #E4E7EC; }
        .preview-dark .preview-line { background: #232830; }
        .preview-line.long { width: 60%; }
        .preview-line.short { width: 40%; }
        .preview-card { margin-top: 6px; height: 40px; background: #FFFFFF; border: 1px solid #E4E7EC; border-radius: 4px; padding: 6px; }
        .preview-dark .preview-card { background: #12151B; border-color: #232830; }
        .preview-num { width: 40%; height: 12px; background: #2D5FE8; border-radius: 2px; }
        .preview-dark .preview-num { background: #5680FF; }
        .swatch-label { display: flex; align-items: center; gap: 8px; padding: 4px 6px; font-size: 12px; font-weight: 500; }
        .rows { display: flex; flex-direction: column; }
        @media (max-width: 900px) { .wrap { padding: 20px 16px 48px; } }
        @media (max-width: 560px) {
          .wrap { padding: 16px 12px 40px; }
          .theme-picker { grid-template-columns: 1fr; padding: 16px; }
        }
      `}</style>
    </AppShell>
  );
}

function Row({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="row">
      <div>
        <div className="row-label">{label}</div>
        <div className="row-value">{value}</div>
      </div>
      {action ?? <button className="btn btn-ghost">Change</button>}
      <style jsx>{`
        .row { display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; border-bottom: 1px solid var(--line-soft); }
        .row:last-child { border-bottom: none; }
        .row-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
        .row-value { font-size: 13px; color: var(--text); font-weight: 500; }
      `}</style>
    </div>
  );
}
