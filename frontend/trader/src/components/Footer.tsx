import { BrandMark } from './BrandLogo';

const COLS = [
  { title: 'Programs', links: [['Step 1 Evaluation', '/challenges'], ['Step 2 Evaluation', '/challenges'], ['Instant Funded', '/challenges']] },
  { title: 'Company', links: [['How it works', '/how-it-works'], ['Payouts', '/payouts'], ['Contact', '/contact']] },
  { title: 'Legal', links: [['Terms & conditions', '/terms'], ['Privacy policy', '/privacy'], ['Refund policy', '/refund-policy']] },
];

export function Footer() {
  return (
    <footer style={{
      background: '#030712', borderTop: '1px solid rgba(240,165,30,0.08)',
      padding: '64px 24px 32px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, marginBottom: 48 }}>
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <BrandMark size={32} />
              <span style={{
                fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #f0a51e, #fbbf24)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>NIVESH GURU</span>
            </div>
            <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
              A performance-based proprietary trading evaluation platform for traders in India.
            </p>
          </div>
          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} style={{ color: 'rgba(148,163,184,0.8)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fbbf24')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.8)')}
                    >{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(240,165,30,0.08)', paddingTop: 24,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 13 }}>
            © {new Date().getFullYear()} Nivesh Guruji. All rights reserved.
          </p>
          <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: 12, maxWidth: 600 }}>
            Disclaimer: Trading involves substantial risk. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
