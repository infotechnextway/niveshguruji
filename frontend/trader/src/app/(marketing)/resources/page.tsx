import type { Metadata } from "next";
import { Reveal } from "@/components/nivesh/Reveal";
import { Eyebrow, SectionHeading } from "@/components/nivesh/primitives";
import { NewsletterForm } from "./NewsletterForm";
import { resources } from "@/lib/nivesh/site";

export const metadata: Metadata = {
  title: "Resources",
  description: "Plain-language guides, explainers, and worksheets to help you invest with confidence.",
};

export default function ResourcesPage() {
  const [featured, ...rest] = resources;

  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="nv-stars" />
        <div className="nv-wrap" style={{ position: "relative", padding: "5rem 1.5rem 2rem", maxWidth: 820 }}>
          <Reveal>
            <Eyebrow>Resources</Eyebrow>
            <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 4rem)", marginTop: "1.2rem" }}>
              Read a little, understand a lot.
            </h1>
            <p className="nv-muted" style={{ marginTop: "1.4rem", fontSize: "1.15rem", lineHeight: 1.6 }}>
              Short, honest guides you can finish in a chai break — no paywalls, no pop-ups.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Featured */}
      <section style={{ paddingTop: "1rem" }}>
        <div className="nv-wrap">
          <Reveal>
            <article
              className="nv-card nv-feature"
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 0,
                overflow: "hidden",
                alignItems: "stretch",
              }}
            >
              <div style={{ padding: "clamp(2rem, 4vw, 3.2rem)" }}>
                <span className="nv-eyebrow">{featured.kicker} {"·"} Featured</span>
                <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", marginTop: "1rem" }}>{featured.title}</h2>
                <p className="nv-muted" style={{ marginTop: "1rem", fontSize: "1.1rem", lineHeight: 1.6 }}>
                  {featured.body}
                </p>
                <p className="nv-mono nv-muted" style={{ marginTop: "1.6rem", fontSize: "0.85rem" }}>
                  {featured.read}
                </p>
              </div>
              <div
                aria-hidden
                style={{
                  minHeight: 220,
                  background:
                    "radial-gradient(circle at 70% 30%, rgba(236,178,62,0.35), transparent 55%), radial-gradient(circle at 30% 80%, rgba(53,198,165,0.35), transparent 55%), var(--nv-ink-2)",
                  position: "relative",
                }}
              >
                <div className="nv-stars" />
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* Grid */}
      <section className="nv-section">
        <div className="nv-wrap">
          <div
            className="nv-cards-3"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}
          >
            {rest.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06}>
                <article className="nv-card" style={{ padding: "1.8rem", height: "100%", display: "flex", flexDirection: "column" }}>
                  <span className="nv-eyebrow" style={{ fontSize: "0.68rem" }}>{r.kicker}</span>
                  <h3 style={{ fontSize: "1.35rem", marginTop: "0.9rem" }}>{r.title}</h3>
                  <p className="nv-muted" style={{ marginTop: "0.7rem", lineHeight: 1.55, flex: 1 }}>{r.body}</p>
                  <p className="nv-mono nv-muted" style={{ marginTop: "1.4rem", fontSize: "0.8rem" }}>{r.read}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="nv-light nv-section">
        <div className="nv-wrap" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
          <SectionHeading
            center
            eyebrow="One email a week"
            title="The Sunday Nivesh note"
            intro="One clear idea about money every Sunday morning. No spam, no selling, unsubscribe anytime."
          />
          <div style={{ marginTop: "2rem" }}>
            <NewsletterForm />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 820px) {
          .nv-feature { grid-template-columns: 1fr !important; }
          .nv-cards-3 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) { .nv-cards-3 { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
