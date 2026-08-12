import Link from "next/link";
import { nav, site } from "@/lib/funded/site";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--ng-line)", background: "var(--ng-bg)", overflow: "hidden" }}>
      <div
        className="ng-wrap ng-foot-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr",
          gap: 40,
          paddingTop: "4rem",
          paddingBottom: "2rem",
        }}
      >
        <div className="ng-foot-brand" style={{ maxWidth: 340, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span aria-hidden style={{ color: "var(--ng-gold)", fontSize: 22, flexShrink: 0 }}>◆</span>
            <span className="ng-display" style={{ fontSize: 20, fontWeight: 700 }}>{site.name}</span>
          </div>
          <p className="ng-muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
            {site.tagline} A funded-trader programme built for India — priced in INR, paid in INR. Based in {site.city}.
          </p>
        </div>

        <div style={{ minWidth: 0 }}>
          <h4 className="ng-eyebrow" style={{ marginBottom: 16 }}>Pages</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="ng-muted" style={{ textDecoration: "none", fontSize: 15 }}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="ng-muted" style={{ textDecoration: "none", fontSize: 15 }}>Login</Link>
            </li>
            <li>
              <Link href="/admin" className="ng-muted" style={{ textDecoration: "none", fontSize: 15 }}>Admin</Link>
            </li>
          </ul>
        </div>

        <div style={{ minWidth: 0 }}>
          <h4 className="ng-eyebrow" style={{ marginBottom: 16 }}>Support</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <a href={`mailto:${site.email}`} className="ng-muted" style={{ textDecoration: "none", fontSize: 15 }}>
                {site.email}
              </a>
            </li>
            <li className="ng-muted" style={{ fontSize: 15 }}>{site.phone}</li>
            <li className="ng-muted" style={{ fontSize: 15 }}>{site.city}</li>
          </ul>
        </div>
      </div>

      <div className="ng-wrap" style={{ paddingBottom: 40 }}>
        <hr className="ng-hairline" style={{ marginBottom: 20 }} />
        <p className="ng-muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          All accounts are simulated. Nivesh Guruji does not provide investment advice, brokerage, or asset-management
          services, and challenge fees are for access to an evaluation of simulated trading. Trading carries substantial
          risk of loss. Payouts reflect performance on simulated accounts subject to the programme terms. Nothing here is
          a solicitation to trade real securities.
        </p>
        <p className="ng-muted" style={{ fontSize: 12.5, marginTop: 12 }}>
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .ng-foot-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
          .ng-foot-brand { grid-column: 1 / -1; max-width: none !important; }
        }
        @media (max-width: 560px) {
          .ng-foot-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
