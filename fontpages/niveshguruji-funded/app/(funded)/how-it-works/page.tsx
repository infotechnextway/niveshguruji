import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading } from "@/components/funded/primitives";
import { steps, metricRows, rewardRows, faqs, models } from "@/lib/funded/site";

export const metadata: Metadata = {
  title: "How it works",
  description: "Evaluation to funded to scale — the rules, targets, and payouts explained plainly.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative", padding: "4.5rem 1.5rem 2rem", maxWidth: 820 }}>
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", marginTop: "1.2rem" }}>Prove it once. Get funded. Scale up.</h1>
            <p className="ng-muted" style={{ marginTop: "1.4rem", fontSize: "1.15rem", lineHeight: 1.6 }}>
              The whole journey is three stages. No hidden gates, no moving targets — just clear rules you can read in a minute.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Stages */}
      <section className="ng-section" style={{ paddingTop: "2rem" }}>
        <div className="ng-wrap" style={{ maxWidth: 900 }}>
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="ng-stage" style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 28, padding: "2.4rem 0", borderTop: i === 0 ? "none" : "1px solid var(--ng-line)" }}>
                <div className="ng-mono ng-grad" style={{ fontSize: "2.8rem", fontWeight: 600, lineHeight: 1 }}>{s.n}</div>
                <div>
                  <div className="ng-eyebrow" style={{ marginBottom: 10 }}>{s.kicker}</div>
                  <h2 style={{ fontSize: "1.7rem" }}>{s.title}</h2>
                  <p className="ng-muted" style={{ marginTop: "0.8rem", fontSize: "1.08rem", lineHeight: 1.65 }}>{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Rules comparison */}
      <section className="ng-section" style={{ paddingTop: 0 }}>
        <div className="ng-wrap">
          <SectionHeading eyebrow="The rules" title="Targets and limits, side by side" />
          <div className="ng-table-wrap" style={{ marginTop: "2.5rem", overflowX: "auto" }}>
            <table className="ng-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>Metric</th>
                  {models.map((m) => (
                    <th key={m.id} style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-gold)" }}>{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row) => (
                  <tr key={row.label}>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)" }}>{row.label}</td>
                    {models.map((m) => (
                      <td key={m.id} style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }}>{row.values[m.id]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ng-reward-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: "2rem" }}>
            {rewardRows.map((r) => (
              <div key={r.label} className="ng-panel" style={{ padding: "1.2rem 1.4rem" }}>
                <div className="ng-muted" style={{ fontSize: "0.82rem" }}>{r.label}</div>
                <div className="ng-mono ng-up" style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: 4 }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ng-section" style={{ paddingTop: 0 }}>
        <div className="ng-wrap" style={{ maxWidth: 820 }}>
          <SectionHeading eyebrow="FAQ" title="The questions traders ask first" />
          <div style={{ marginTop: "2.5rem", display: "grid", gap: 12 }}>
            {faqs.map((f, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <details className="ng-panel" style={{ padding: "1.3rem 1.5rem" }}>
                  <summary className="ng-display" style={{ cursor: "pointer", fontSize: "1.15rem", listStyle: "none" }}>{f.q}</summary>
                  <p className="ng-muted" style={{ marginTop: "0.9rem", lineHeight: 1.65 }}>{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: "2.4rem", textAlign: "center" }}>
            <Link href="/challenges" className="ng-btn ng-btn-gold">Choose your challenge →</Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 640px){
          .ng-stage { grid-template-columns: 1fr !important; gap: 8px !important; }
          .ng-reward-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  );
}
