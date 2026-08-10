import Link from "next/link";
import { nav, site } from "@/lib/nivesh/site";

export function Footer() {
  return (
    <footer className="nv-footer">
      <div className="nv-wrap nv-footer-grid">
        <div className="nv-footer-brand">
          <div className="nv-footer-brand__row">
            <span aria-hidden className="nv-footer-star">{"✦"}</span>
            <span className="nv-display nv-footer-name">{site.name}</span>
          </div>
          <p className="nv-muted nv-footer-tagline">
            {site.tagline} Investor education for everyday India — from {site.city}.
          </p>
        </div>

        <div>
          <h4 className="nv-eyebrow" style={{ marginBottom: 16 }}>Explore</h4>
          <ul className="nv-footer-list">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="nv-muted nv-footer-link">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="nv-muted nv-footer-link">Login</Link>
            </li>
            <li>
              <Link href="/admin" className="nv-muted nv-footer-link">Admin</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="nv-eyebrow" style={{ marginBottom: 16 }}>Reach us</h4>
          <ul className="nv-footer-list">
            <li>
              <a href={`mailto:${site.email}`} className="nv-muted nv-footer-link">
                {site.email}
              </a>
            </li>
            <li className="nv-muted" style={{ fontSize: 15 }}>{site.phone}</li>
            <li className="nv-muted" style={{ fontSize: 15 }}>{site.city}</li>
          </ul>
        </div>
      </div>

      <div className="nv-wrap nv-footer-bottom">
        <hr className="nv-hairline" style={{ marginBottom: 24 }} />
        <div className="nv-footer-legal nv-muted">
          <span>
            {"©"} {new Date().getFullYear()} {site.name}. Investor education, not investment advice.
          </span>
          <span>Markets carry risk. Read all scheme documents before investing.</span>
        </div>
      </div>

      <style>{`
        .nv-footer {
          border-top: 1px solid var(--nv-line);
          background: var(--nv-ink);
          overflow: hidden;
        }
        .nv-footer-grid {
          display: grid;
          gap: 40px;
          grid-template-columns: 1.5fr 1fr 1fr;
          padding-top: 4rem;
          padding-bottom: 2rem;
        }
        .nv-footer-brand { max-width: 320px; }
        .nv-footer-brand__row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .nv-footer-star { color: var(--nv-gold); font-size: 20px; flex-shrink: 0; }
        .nv-footer-name { font-size: 22px; font-weight: 600; }
        .nv-footer-tagline { margin-top: 14px; line-height: 1.6; }
        .nv-footer-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
        }
        .nv-footer-link {
          text-decoration: none;
          font-size: 15px;
          display: inline-block;
          max-width: 100%;
        }
        .nv-footer-bottom { padding-bottom: 40px; }
        .nv-footer-legal {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: space-between;
          font-size: 13px;
          line-height: 1.5;
        }
        .nv-footer-legal > span { flex: 1 1 220px; min-width: 0; }
      `}</style>
    </footer>
  );
}
