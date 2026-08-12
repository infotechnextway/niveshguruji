"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { models, metricRows, rewardRows, accountSizes, site, type ModelId } from "@/lib/funded/site";
import { inr, discounted } from "@/lib/funded/format";

export function ChallengeSelector() {
  const [model, setModel] = useState<ModelId>("oneStep");
  const [sizeId, setSizeId] = useState("10L");
  const [copied, setCopied] = useState(false);

  const size = accountSizes.find((s) => s.id === sizeId)!;
  const base = size.prices[model];
  const now = discounted(base);
  const modelMeta = models.find((m) => m.id === model)!;

  function copyCode() {
    navigator.clipboard?.writeText(site.discountCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="ng-card" style={{ padding: "clamp(1.4rem, 3vw, 2.2rem)" }}>
      {/* Model tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {models.map((m) => {
          const active = m.id === model;
          return (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className="ng-mono"
              style={{
                position: "relative",
                padding: "0.7rem 1.2rem",
                borderRadius: 10,
                border: `1px solid ${active ? "var(--ng-gold)" : "var(--ng-line)"}`,
                background: active ? "rgba(240,180,41,0.1)" : "transparent",
                color: active ? "var(--ng-gold)" : "var(--ng-muted)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              {m.name}
              {m.badge && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: "0.6rem",
                    background: "var(--ng-teal)",
                    color: "#04231a",
                    padding: "2px 6px",
                    borderRadius: 999,
                    letterSpacing: "0.06em",
                  }}
                >
                  {m.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="ng-muted" style={{ marginTop: "0.8rem", fontSize: "0.95rem" }}>{modelMeta.tagline}</p>

      {/* Account size selector */}
      <div style={{ marginTop: "1.4rem" }}>
        <div className="ng-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Account size
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {accountSizes.map((s) => {
            const active = s.id === sizeId;
            return (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className="ng-mono"
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: 10,
                  border: `1px solid ${active ? "var(--ng-gold)" : "var(--ng-line)"}`,
                  background: active ? "var(--ng-gold)" : "transparent",
                  color: active ? "#241a02" : "var(--ng-ivory)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {s.display}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics + rules */}
      <div className="ng-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: "1.8rem" }}>
        <div>
          <div className="ng-eyebrow" style={{ marginBottom: 14 }}>Target metrics</div>
          <dl style={{ margin: 0, display: "grid", gap: 12 }}>
            {metricRows.map((row) => {
              const v = row.values[model];
              if (v === "—") return null;
              return (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--ng-line)", paddingBottom: 10 }}>
                  <dt className="ng-muted" style={{ fontSize: "0.9rem" }}>{row.label}</dt>
                  <dd className="ng-mono" style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div>
          <div className="ng-eyebrow" style={{ marginBottom: 14 }}>Reward rules</div>
          <dl style={{ margin: 0, display: "grid", gap: 12 }}>
            {rewardRows.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--ng-line)", paddingBottom: 10 }}>
                <dt className="ng-muted" style={{ fontSize: "0.9rem" }}>{row.label}</dt>
                <dd className="ng-mono ng-up" style={{ margin: 0, fontWeight: 600 }}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Price + CTA */}
      <div
        className="ng-price-row"
        style={{
          marginTop: "1.8rem",
          padding: "1.4rem",
          borderRadius: 14,
          background: "var(--ng-bg-2)",
          border: "1px solid var(--ng-line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="ng-muted" style={{ fontSize: "0.82rem" }}>
            {modelMeta.name} · {size.full}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <span className="ng-mono ng-grad" style={{ fontSize: "2.2rem", fontWeight: 600 }}>{inr(now)}</span>
            <span className="ng-mono ng-muted" style={{ textDecoration: "line-through", fontSize: "1.1rem" }}>{inr(base)}</span>
          </div>
          <button
            onClick={copyCode}
            className="ng-mono"
            style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "var(--ng-gold)", cursor: "pointer", fontSize: "0.85rem" }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Code copied" : `Use code ${site.discountCode} — ${site.discountPct}% off`}
          </button>
        </div>
        <Link href="/register" className="ng-btn ng-btn-gold">Start challenge →</Link>
      </div>

      <p className="ng-muted" style={{ marginTop: 14, fontSize: "0.78rem" }}>
        Simulated funded accounts. Trading involves risk. Payouts are made on simulated performance per our terms.
      </p>

      <style>{`
        @media (max-width: 640px) {
          .ng-cols-2 { grid-template-columns: 1fr !important; }
          .ng-price-row { flex-direction: column !important; align-items: stretch !important; }
        }
      `}</style>
    </div>
  );
}
