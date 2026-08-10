import Link from "next/link";
import { OrbCanvas } from "@/components/nivesh/OrbCanvas";
import { Reveal } from "@/components/nivesh/Reveal";
import { Eyebrow, SectionHeading, Stat } from "@/components/nivesh/primitives";
import { stats, values, topics, steps, testimonials } from "@/lib/nivesh/site";

export default function HomePage() {
  return (
    <>
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="nv-stars" />
        <div
          className="nv-wrap nv-hero-grid"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 40,
            alignItems: "center",
            minHeight: "min(88vh, 760px)",
            paddingTop: "3rem",
            paddingBottom: "3rem",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Reveal>
              <Eyebrow>Investing, simplified</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 style={{ fontSize: "clamp(2.1rem, 6vw, 4.6rem)", marginTop: "1.2rem" }}>
                Grow your money with a guide who <span className="nv-grad">actually explains things</span>.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p
                className="nv-muted"
                style={{ marginTop: "1.6rem", fontSize: "clamp(1rem, 2.8vw, 1.2rem)", lineHeight: 1.6, maxWidth: 520 }}
              >
                No jargon, no commissions, no pressure. Just plain lessons and a personal plan that
                turn “I should start investing” into money quietly growing every month.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="nv-cta-row" style={{ marginTop: "2.2rem" }}>
                <Link href="/register" className="nv-btn nv-btn-gold">
                  Start free {"→"}
                </Link>
                <Link href="/login" className="nv-btn nv-btn-ghost">
                  Login
                </Link>
                <Link href="/how-it-works" className="nv-btn nv-btn-ghost">
                  See how it works
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <p className="nv-muted" style={{ marginTop: "1.6rem", fontSize: "0.9rem" }}>
                Trusted by 42,000+ first-time investors across India.
              </p>
            </Reveal>
          </div>

          <div className="nv-hero-orb nv-orb-frame" style={{ height: "min(70vh, 560px)", minHeight: 280 }}>
            <OrbCanvas />
          </div>
        </div>
      </section>

      <section style={{ borderTop: "1px solid var(--nv-line)", borderBottom: "1px solid var(--nv-line)" }}>
        <div
          className="nv-wrap nv-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 32,
            paddingTop: "3rem",
            paddingBottom: "3rem",
          }}
        >
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <Stat {...s} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="nv-section">
        <div className="nv-wrap">
          <SectionHeading
            eyebrow="Why us"
            title="A guide on your side of the table"
            intro="Most “free” investing help is paid for by the products it recommends. We flipped that."
          />
          <div
            className="nv-cards-3"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
              marginTop: "3rem",
            }}
          >
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="nv-card" style={{ padding: "clamp(1.25rem, 4vw, 2rem)", height: "100%" }}>
                  <span aria-hidden style={{ color: "var(--nv-gold)", fontSize: 22 }}>{"✦"}</span>
                  <h3 style={{ fontSize: "1.4rem", marginTop: "1rem" }}>{v.title}</h3>
                  <p className="nv-muted" style={{ marginTop: "0.8rem", lineHeight: 1.6 }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-light nv-section">
        <div className="nv-wrap">
          <SectionHeading
            eyebrow="What you’ll learn"
            title="The whole map, none of the maze"
            intro="Six areas cover almost everything a household in India needs. We teach them in the order that keeps you calm and consistent."
          />
          <div
            className="nv-cards-3"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              marginTop: "3rem",
            }}
          >
            {topics.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.05}>
                <div
                  style={{
                    padding: "clamp(1.15rem, 3.5vw, 1.6rem)",
                    borderRadius: "var(--nv-radius)",
                    border: "1px solid var(--nv-line-2)",
                    background: "#fff",
                    height: "100%",
                  }}
                >
                  <div className="nv-mono" style={{ color: "#a9781a", fontSize: 13, letterSpacing: "0.05em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 style={{ fontSize: "1.3rem", marginTop: "0.6rem" }}>{t.title}</h3>
                  <p style={{ marginTop: "0.4rem", color: "var(--nv-muted-2)" }}>{t.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="nv-section">
        <div className="nv-wrap">
          <SectionHeading eyebrow="How it works" title="Four steps, at your pace" />
          <div
            className="nv-cards-4"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              marginTop: "2.5rem",
            }}
          >
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.07}>
                <div style={{ paddingTop: "1.4rem", borderTop: "2px solid var(--nv-gold)" }}>
                  <div className="nv-mono nv-muted" style={{ fontSize: 13 }}>{s.n}</div>
                  <h3 style={{ fontSize: "1.25rem", marginTop: "0.7rem" }}>{s.title}</h3>
                  <p className="nv-muted" style={{ marginTop: "0.6rem", fontSize: "0.95rem", lineHeight: 1.55 }}>
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: "2.5rem" }}>
            <Link href="/how-it-works" className="nv-btn nv-btn-ghost">
              Read the full walkthrough {"→"}
            </Link>
          </div>
        </div>
      </section>

      <section className="nv-light nv-section">
        <div className="nv-wrap">
          <SectionHeading eyebrow="In their words" title="Started nervous. Stayed for the clarity." />
          <div
            className="nv-cards-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 24,
              marginTop: "3rem",
            }}
          >
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <figure
                  style={{
                    margin: 0,
                    padding: "clamp(1.25rem, 4vw, 2rem)",
                    borderRadius: "var(--nv-radius)",
                    background: "#fff",
                    border: "1px solid var(--nv-line-2)",
                    height: "100%",
                  }}
                >
                  <blockquote
                    className="nv-display"
                    style={{ margin: 0, fontSize: "clamp(1.1rem, 3.5vw, 1.4rem)", lineHeight: 1.4, color: "var(--nv-ink)" }}
                  >
                    {"“"}{t.quote}{"”"}
                  </blockquote>
                  <figcaption style={{ marginTop: "1.4rem", color: "var(--nv-muted-2)" }}>
                    <strong style={{ color: "var(--nv-ink)" }}>{t.name}</strong> {"·"} {t.role}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="nv-stars" />
        <div className="nv-wrap" style={{ position: "relative", padding: "clamp(3.5rem, 8vw, 6rem) 0", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Your first step</Eyebrow>
            <h2 style={{ fontSize: "clamp(1.8rem, 5vw, 3.6rem)", margin: "1.2rem auto 0", maxWidth: 760 }}>
              The best day to start was years ago. The second best is <span className="nv-grad">today</span>.
            </h2>
            <p className="nv-muted" style={{ margin: "1.4rem auto 0", maxWidth: 520, fontSize: "clamp(1rem, 2.8vw, 1.1rem)" }}>
              Begin with the free lessons. Upgrade only when you want a guide walking beside you.
            </p>
            <div className="nv-cta-row" style={{ marginTop: "2.4rem", justifyContent: "center" }}>
              <Link href="/register" className="nv-btn nv-btn-gold">
                Start free today {"→"}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
