'use client';
import { AppShell } from '@/components/AppShell';
import { paise } from '@/lib/format';
import { Icon } from '@/components/Icons';

const LEDGER = [
  { at: '31 Jul, 09:15', type: 'CREDIT', desc: 'Virtual capital granted — Evaluator ₹10,00,000', amountPaise: 10_00_000_00, balancePaise: 10_00_000_00 },
  { at: '31 Jul, 11:42', type: 'PNL', desc: 'Realized P&L — RELIANCE trade', amountPaise: 15_720_00, balancePaise: 10_15_720_00 },
  { at: '31 Jul, 11:42', type: 'CHARGE', desc: 'Charges — RELIANCE trade', amountPaise: -140_00, balancePaise: 10_15_580_00 },
  { at: '31 Jul, 13:20', type: 'PNL', desc: 'Realized P&L — INFY trade', amountPaise: 8_100_00, balancePaise: 10_23_680_00 },
  { at: '31 Jul, 13:20', type: 'CHARGE', desc: 'Charges — INFY trade', amountPaise: -230_00, balancePaise: 10_23_450_00 },
];

export default function FundsPage() {
  return (
    <AppShell userName="Kapil">
      <main className="main">
        <div className="wrap">
          <div className="page-head">
            <div><h1 className="ph-title">Funds</h1><p className="dim">Virtual capital ledger for your evaluation account.</p></div>
            <button className="btn btn-secondary">Export statement</button>
          </div>

          <div className="grid-3">
            <div className="card sc">
              <div className="sc-icon"><Icon.Wallet size={14}/></div>
              <div className="sc-label">Available margin</div>
              <div className="sc-val num">{paise(9_88_720_00)}</div>
            </div>
            <div className="card sc">
              <div className="sc-icon"><Icon.Sliders size={14}/></div>
              <div className="sc-label">Used margin</div>
              <div className="sc-val num">{paise(40_000_00)}</div>
            </div>
            <div className="card sc">
              <div className="sc-icon"><Icon.Package size={14}/></div>
              <div className="sc-label">Opening balance</div>
              <div className="sc-val num">{paise(10_00_000_00)}</div>
            </div>
          </div>

          <div className="card-lg table-scroll" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 13, fontWeight: 500 }}>Ledger</h3>
              <span className="dim" style={{ fontSize: 11 }}>Showing last 30 days</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th><th>Type</th><th>Description</th>
                  <th className="r">Amount</th><th className="r">Balance</th>
                </tr>
              </thead>
              <tbody>
                {LEDGER.map((l, i) => (
                  <tr key={i}>
                    <td className="num dim">{l.at}</td>
                    <td>
                      <span className={`badge ${
                        l.type === 'CREDIT' ? 'badge-info'
                        : l.type === 'PNL' ? (l.amountPaise >= 0 ? 'badge-success' : 'badge-danger')
                        : 'badge-neutral'
                      }`}>{l.type}</span>
                    </td>
                    <td>{l.desc}</td>
                    <td className={`r num ${l.amountPaise >= 0 ? 'gain' : 'loss'}`}>{paise(l.amountPaise, { sign: true })}</td>
                    <td className="r num">{paise(l.balancePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <style jsx>{`
        .main { background: var(--bg); }
        .wrap { max-width: 1400px; margin: 0 auto; padding: 28px 32px 60px; display: flex; flex-direction: column; gap: 20px; }
        .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .ph-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .sc { padding: 20px; display: flex; flex-direction: column; gap: 8px; position: relative; }
        .sc-icon { position: absolute; top: 20px; right: 20px; color: var(--text-faint); }
        .sc-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.06em; }
        .sc-val { font-size: 22px; font-weight: 400; letter-spacing: -0.02em; }
        .table-scroll { overflow-x: auto; }
        @media (max-width: 900px) { .wrap { padding: 20px 16px 48px; } .grid-3 { grid-template-columns: 1fr; } }
        @media (max-width: 560px) { .wrap { padding: 16px 12px 40px; } }
      `}</style>
    </AppShell>
  );
}
