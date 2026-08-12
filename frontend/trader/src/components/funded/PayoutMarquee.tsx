import { payouts } from "@/lib/funded/site";
import { inr } from "@/lib/funded/format";

export function PayoutMarquee() {
  const items = [...payouts, ...payouts];
  return (
    <div style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)" }}>
      <div className="ng-marquee ng-marquee-fast" style={{ gap: 16, padding: "0.25rem 0" }}>
        {items.map((p, i) => (
          <div
            key={i}
            className="ng-panel"
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "0.9rem 1.2rem", minWidth: 250, whiteSpace: "nowrap" }}
          >
            <span
              className="ng-mono"
              style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ng-teal)", border: "1px solid rgba(47,214,165,0.4)", borderRadius: 6, padding: "2px 7px" }}
            >
              PAID
            </span>
            <div>
              <div className="ng-mono" style={{ fontSize: "1.05rem", fontWeight: 600 }}>{inr(p.amount)}</div>
              <div className="ng-muted" style={{ fontSize: "0.78rem" }}>
                {p.name} · {p.city} · {p.hrs}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
