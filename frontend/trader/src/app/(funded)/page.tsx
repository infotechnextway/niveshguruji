import Link from "next/link";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading, Stat } from "@/components/funded/primitives";
import { Ticker } from "@/components/funded/Ticker";
import { PayoutMarquee } from "@/components/funded/PayoutMarquee";
import { EquityCurve } from "@/components/funded/EquityCurve";
import { ChallengeSelector } from "@/components/funded/ChallengeSelector";
import { heroStats, whyChoose, steps } from "@/lib/funded/site";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div
          className="ng-wrap ng-hero"
          style={{ position: "relative", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center", padding: "4rem 1.5rem 4.5rem" }}
        >
          <div>
            <Reveal><Eyebrow>Funded trading, made in India</Eyebrow></Reveal>
            <Reveal delay={0.05}>
              <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)", marginTop: "1.2rem" }}>
                Trade our capital.<br /><span className="ng-grad">Keep up to 90%.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="ng-muted" style={{ marginTop: "1.5rem", fontSize: "1.2rem", lineHeight: 1.6, maxWidth: 500 }}>
                Pass one evaluation, get a simulated funded account up to ₹2 crore, and withdraw your rewards in INR within 24 hours. Instant, 1-Step and 2-Step routes to fit your style.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: "2.2rem" }}>
                <Link href="/challenges" className="ng-btn ng-btn-gold">Get funded →</Link>
                <Link href="/how-it-works" className="ng-btn ng-btn-ghost">How it works</Link>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <div style={{ display: "flex", gap: 10, marginTop: "1.8rem", flexWrap: "wrap" }}>
                <span className="ng-chip">Up to 90% split</span>
                <span className="ng-chip">No consistency rule</span>
                <span className="ng-chip">24-hour payouts</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <EquityCurve />
          </Reveal>
        </div>
      </section>

      <Ticker />

      {/* STATS */}
      <section style={{ borderBottom: "1px solid var(--ng-line)" }}>
        <div className="ng-wrap ng-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, padding: "3rem 1.5rem" }}>
          {heroStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}><Stat {...s} /></Reveal>
          ))}
        </div>
      </section>

      {/* PAYOUTS MARQUEE */}
      <section className="ng-section" style={{ paddingBottom: "3rem" }}>
        <div className="ng-wrap" style={{ marginBottom: "2rem" }}>
          <SectionHeading eyebrow="Real payouts, real traders" title="Money out the door, every day" />
        </div>
        <PayoutMarquee />
      </section>

      {/* WHY CHOOSE */}
      <section className="ng-section" style={{ paddingTop: "2rem" }}>
        <div className="ng-wrap">
          <SectionHeading eyebrow="Why Nivesh Guruji" title="Built for traders, not gatekeepers" />
          <div className="ng-why" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20, marginTop: "3rem" }}>
            {whyChoose.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <div className="ng-card" style={{ padding: "2rem", height: "100%" }}>
                  <span aria-hidden style={{ color: "var(--ng-gold)", fontSize: 20 }}>◆</span>
                  <h3 style={{ fontSize: "1.4rem", marginTop: "0.9rem" }}>{v.title}</h3>
                  <p className="ng-muted" style={{ marginTop: "0.7rem", lineHeight: 1.6 }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CHALLENGE SELECTOR */}
      <section className="ng-section" style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative" }}>
          <SectionHeading eyebrow="Choose your challenge" title="Pick a route, pick a size, get funded" intro="Every route is priced in INR and pays out in INR. Adjust the model and account size to see your exact rules and price." />
          <div style={{ marginTop: "3rem" }}>
            <ChallengeSelector />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="ng-section" style={{ paddingTop: 0 }}>
        <div className="ng-wrap">
          <SectionHeading eyebrow="How it works" title="Three steps to funded" />
          <div className="ng-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: "2.5rem" }}>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="ng-card" style={{ padding: "1.8rem", height: "100%" }}>
                  <div className="ng-mono" style={{ color: "var(--ng-gold)", fontSize: "0.8rem", letterSpacing: "0.1em" }}>{s.n} · {s.kicker}</div>
                  <h3 style={{ fontSize: "1.35rem", marginTop: "0.8rem" }}>{s.title}</h3>
                  <p className="ng-muted" style={{ marginTop: "0.7rem", lineHeight: 1.6 }}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: "2.4rem" }}>
            <Link href="/how-it-works" className="ng-btn ng-btn-ghost">See the full breakdown →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative", padding: "6rem 1.5rem", textAlign: "center" }}>
          <Reveal>
            <Eyebrow>Your capital is waiting</Eyebrow>
            <h2 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", margin: "1.2rem auto 0", maxWidth: 720 }}>
              Stop risking your own money. <span className="ng-grad">Trade ours.</span>
            </h2>
            <div style={{ marginTop: "2.4rem" }}>
              <Link href="/challenges" className="ng-btn ng-btn-gold">Start your challenge →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px){
          .ng-hero { grid-template-columns: 1fr !important; }
          .ng-stats { grid-template-columns: repeat(2,1fr) !important; }
          .ng-why, .ng-steps { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px){ .ng-stats { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
