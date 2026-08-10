import Link from "next/link";
import { nav, site } from "@/lib/nivesh/site";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--nv-line)", background: "var(--nv-ink)" }}>
      <div
        className="nv-wrap"
        style={{ display: "grid", gap: 40, gridTemplateColumns: "1.5fr 1fr 1fr", padding: "4rem 1.5rem 2rem" }}
      >
        <div style={{ maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden style={{ color: "var(--nv-gold)", fontSize: 20 }}>{"✦"}</span>
            <span className="nv-display" style={{ fontSize: 22, fontWeight: 600 }}>{site.name}</span>
          </div>
          <p className="nv-muted" style={{ marginTop: 14, lineHeight: 1.6 }}>
            {site.tagline} Investor education for everyday India — from {site.city}.
          </p>
        </div>

        <div>
          <h4 className="nv-eyebrow" style={{ marginBottom: 16 }}>Explore</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="nv-muted" style={{ textDecoration: "none", fontSize: 15 }}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="nv-muted" style={{ textDecoration: "none", fontSize: 15 }}>
                Login
              </Link>
            </li>
            <li>
              <Link href="/admin" className="nv-muted" style={{ textDecoration: "none", fontSize: 15 }}>
                Admin
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="nv-eyebrow" style={{ marginBottom: 16 }}>Reach us</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <a href={`mailto:${site.email}`} className="nv-muted" style={{ textDecoration: "none", fontSize: 15 }}>
                {site.email}
              </a>
            </li>
            <li className="nv-muted" style={{ fontSize: 15 }}>{site.phone}</li>
            <li className="nv-muted" style={{ fontSize: 15 }}>{site.city}</li>
          </ul>
        </div>
      </div>

      <div className="nv-wrap" style={{ paddingBottom: 40 }}>
        <hr className="nv-hairline" style={{ marginBottom: 24 }} />
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", fontSize: 13 }}
          className="nv-muted"
        >
          <span>
            {"©"} {new Date().getFullYear()} {site.name}. Investor education, not investment advice.
          </span>
          <span>Markets carry risk. Read all scheme documents before investing.</span>
        </div>
      </div>
    </footer>
  );
}
