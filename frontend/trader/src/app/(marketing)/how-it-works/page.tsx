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
        <div className="nv-wrap" style={{ position: "relative", padding: "clamp(3rem, 8vw, 5rem) 0 3rem", maxWidth: 820 }}>
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h1 style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)", marginTop: "1.2rem" }}>
              From confused to confident, one calm step at a time.
            </h1>
            <p className="nv-muted" style={{ marginTop: "1.4rem", fontSize: "clamp(1rem, 2.8vw, 1.15rem)", lineHeight: 1.6 }}>
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
                  padding: "clamp(1.5rem, 4vw, 2.5rem) 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--nv-line)",
                }}
              >
                <div
                  className="nv-mono nv-grad"
                  style={{ fontSize: "clamp(2.2rem, 8vw, 3rem)", fontWeight: 600, lineHeight: 1 }}
                >
                  {s.n}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: "clamp(1.35rem, 4vw, 1.7rem)" }}>{s.title}</h2>
                  <p className="nv-muted" style={{ marginTop: "0.8rem", fontSize: "clamp(0.98rem, 2.6vw, 1.08rem)", lineHeight: 1.65 }}>
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
                    padding: "clamp(1rem, 3.5vw, 1.4rem) clamp(1rem, 3.5vw, 1.6rem)",
                  }}
                >
                  <summary
                    className="nv-display"
                    style={{
                      cursor: "pointer",
                      fontSize: "clamp(1.05rem, 3.5vw, 1.2rem)",
                      color: "var(--nv-ink)",
                      listStyle: "none",
                    }}
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
          <h2 style={{ fontSize: "clamp(1.7rem, 4.5vw, 3rem)", maxWidth: 640, margin: "0 auto" }}>
            Ready for step one?
          </h2>
          <div className="nv-cta-row" style={{ marginTop: "2rem", justifyContent: "center" }}>
            <Link href="/contact" className="nv-btn nv-btn-gold">
              Book your free check-in {"→"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
