import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/nivesh/Reveal";
import { Eyebrow, SectionHeading } from "@/components/nivesh/primitives";
import { steps, faqs } from "@/lib/nivesh/site";

export const metadata: Metadata = {
  title: "How it works",
  description: "Four calm steps from confused to confident investor — at your own pace.",
};

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="nv-stars" />
        <div className="nv-wrap" style={{ position: "relative", padding: "5rem 1.5rem 3rem", maxWidth: 820 }}>
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", marginTop: "1.2rem" }}>
              From confused to confident, one calm step at a time.
            </h1>
            <p className="nv-muted" style={{ marginTop: "1.4rem", fontSize: "1.15rem", lineHeight: 1.6 }}>
              There’s no dashboard to master and no account to link before you’re ready. The whole
              method is four steps you can move through as slowly as you like.
            </p>
          </Reveal>
        </div>
      </section>

      {/* The steps as a vertical typed timeline (numbering is honest here) */}
      <section className="nv-section" style={{ paddingTop: "2rem" }}>
        <div className="nv-wrap" style={{ maxWidth: 860 }}>
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div
                className="nv-step-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  gap: 32,
                  padding: "2.5rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--nv-line)",
                }}
              >
                <div
                  className="nv-mono nv-grad"
                  style={{ fontSize: "3rem", fontWeight: 600, lineHeight: 1 }}
                >
                  {s.n}
                </div>
                <div>
                  <h2 style={{ fontSize: "1.7rem" }}>{s.title}</h2>
                  <p className="nv-muted" style={{ marginTop: "0.8rem", fontSize: "1.08rem", lineHeight: 1.65 }}>
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="nv-light nv-section">
        <div className="nv-wrap" style={{ maxWidth: 820 }}>
          <SectionHeading eyebrow="Honest answers" title="The questions everyone actually asks" />
          <div style={{ marginTop: "2.5rem", display: "grid", gap: 12 }}>
            {faqs.map((f, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <details
                  style={{
                    background: "#fff",
                    borderRadius: "var(--nv-radius)",
                    border: "1px solid var(--nv-line-2)",
                    padding: "1.4rem 1.6rem",
                  }}
                >
                  <summary
                    className="nv-display"
                    style={{ cursor: "pointer", fontSize: "1.2rem", color: "var(--nv-ink)", listStyle: "none" }}
                  >
                    {f.q}
                  </summary>
                  <p style={{ marginTop: "1rem", color: "var(--nv-muted-2)", lineHeight: 1.65 }}>{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="nv-section" style={{ textAlign: "center" }}>
        <div className="nv-wrap">
          <h2 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", maxWidth: 640, margin: "0 auto" }}>
            Ready for step one?
          </h2>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/contact" className="nv-btn nv-btn-gold">
              Book your free check-in {"→"}
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 640px) {
          .nv-step-row { grid-template-columns: 1fr !important; gap: 8px !important; }
        }
      `}</style>
    </>
  );
}
