import { ticker } from "@/lib/funded/site";

export function Ticker() {
  const items = [...ticker, ...ticker]; // duplicate for seamless loop
  return (
    <div
      style={{
        borderTop: "1px solid var(--ng-line)",
        borderBottom: "1px solid var(--ng-line)",
        background: "rgba(255,255,255,0.015)",
        overflow: "hidden",
        maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
      }}
    >
      <div className="ng-marquee" style={{ padding: "0.7rem 0" }}>
        {items.map((t, i) => (
          <div key={i} className="ng-mono" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 1.6rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--ng-muted)", letterSpacing: "0.04em" }}>{t.pair}</span>
            <span style={{ color: "var(--ng-ivory)" }}>{t.price}</span>
            <span className={t.up ? "ng-up" : "ng-down"}>
              {t.up ? "▲" : "▼"} {t.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
