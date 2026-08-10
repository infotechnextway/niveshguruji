import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Reveal } from "@/components/nivesh/Reveal";
import { Eyebrow, SectionHeading } from "@/components/nivesh/primitives";
import { plans } from "@/lib/nivesh/site";

export const metadata: Metadata = {
  title: "Plans",
  description: "Start free forever. Upgrade only when you want a personal guide walking beside you.",
};

export default function PlansPage() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="nv-stars" />
        <div className="nv-wrap" style={{ position: "relative", padding: "5rem 1.5rem 2rem", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Plans</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", margin: "1.2rem auto 0", maxWidth: 720 }}>
              Pay for guidance, never for products.
            </h1>
            <p className="nv-muted" style={{ margin: "1.4rem auto 0", maxWidth: 560, fontSize: "1.15rem" }}>
              The learning is free forever. The paid plans simply add a human guide and a plan shaped
              around your life. Cancel any month.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="nv-section" style={{ paddingTop: "3rem" }}>
        <div className="nv-wrap">
          <div
            className="nv-plans-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "start" }}
          >
            {plans.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div
                  className="nv-card"
                  style={{
                    padding: "2.2rem",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderColor: p.featured ? "var(--nv-gold)" : undefined,
                    boxShadow: p.featured ? "var(--nv-glow)" : undefined,
                    position: "relative",
                  }}
                >
                  {p.featured && (
                    <span
                      className="nv-eyebrow"
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "2.2rem",
                        background: "var(--nv-gold)",
                        color: "#2a1e05",
                        padding: "4px 12px",
                        borderRadius: 999,
                        fontSize: "0.68rem",
                      }}
                    >
                      Most chosen
                    </span>
                  )}
                  <h2 style={{ fontSize: "1.6rem" }}>{p.name}</h2>
                  <div style={{ marginTop: "1rem", display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="nv-mono nv-grad" style={{ fontSize: "2.6rem", fontWeight: 600 }}>
                      {p.price}
                    </span>
                    <span className="nv-muted" style={{ fontSize: "0.95rem" }}>{p.cadence}</span>
                  </div>
                  <p className="nv-muted" style={{ marginTop: "0.8rem", lineHeight: 1.55 }}>{p.blurb}</p>

                  <ul style={{ listStyle: "none", padding: 0, margin: "1.8rem 0", display: "grid", gap: 12, flex: 1 }}>
                    {p.features.map((f) => (
                      <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Check size={18} style={{ color: "var(--nv-teal)", flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: "0.98rem", lineHeight: 1.45 }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`nv-btn ${p.featured ? "nv-btn-gold" : "nv-btn-ghost"}`}
                    style={{ justifyContent: "center" }}
                  >
                    {p.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-light nv-section">
        <div className="nv-wrap" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <SectionHeading
            center
            eyebrow="No fine print"
            title="What every plan promises"
            intro="We never earn a commission on anything you invest in. No lock-in contracts. Cancel from your account in two clicks, keep every lesson you’ve unlocked."
          />
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .nv-plans-grid { grid-template-columns: 1fr !important; max-width: 460px; margin: 0 auto; } }
      `}</style>
    </>
  );
}
