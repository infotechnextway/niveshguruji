import Link from "next/link";
import { Clock, Percent, ShieldCheck, LineChart } from "lucide-react";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading, Stat } from "@/components/funded/primitives";
import { Ticker } from "@/components/funded/Ticker";
import { PayoutMarquee } from "@/components/funded/PayoutMarquee";
import { EquityCurve } from "@/components/funded/EquityCurve";
import { ChallengeSelector } from "@/components/funded/ChallengeSelector";
import { FaqList } from "@/components/funded/FaqList";
import { heroStats, whyChoose, steps } from "@/lib/funded/site";

const featureIcons = [Clock, Percent, ShieldCheck, LineChart];

export default function HomePage() {
  return (
    <>
      {/* ================= HERO ================= */}
      <section style={{ position: "relative", overflow: "hidden", background: "var(--ng-bg)" }}>
        <div className="ng-aura" />
        <div
          className="ng-wrap ng-hero"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1.02fr 0.98fr",
            gap: 56,
            alignItems: "center",
            padding: "4.5rem 1.5rem 5rem",
          }}
        >
          <div>
            <Reveal>
              <span className="ng-chip ng-mono" style={{ color: "var(--ng-gold-dark)", background: "var(--ng-gold-soft)", borderColor: "rgba(240,165,30,0.35)", fontWeight: 600 }}>
                ★ Funded trading, made in India
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 style={{ fontSize: "clamp(2.6rem, 5.6vw, 4.2rem)", marginTop: "1.4rem" }}>
                Trade our capital.<br /><span className="ng-grad">Keep up to 90%.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.13}>
              <p className="ng-muted" style={{ marginTop: "1.4rem", fontSize: "1.18rem", lineHeight: 1.65, maxWidth: 500 }}>
                Pass one evaluation, get a simulated funded account up to ₹2 crore, and withdraw
                your rewards in INR within 24 hours. Instant, 1-Step and 2-Step routes to fit your style.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: "2.2rem" }}>
                <Link href="/challenges" className="ng-btn ng-btn-gold">Get funded →</Link>
                <Link href="/how-it-works" className="ng-btn ng-btn-ghost">How it works</Link>
              </div>
            </Reveal>
            <Reveal delay={0.27}>
              <div style={{ display: "flex", gap: 10, marginTop: "1.9rem", flexWrap: "wrap" }}>
                <span className="ng-chip">Up to 90% split</span>
                <span className="ng-chip">No consistency rule</span>
                <span className="ng-chip">24-hour payouts</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.16}>
            <EquityCurve />
          </Reveal>
        </div>
      </section>

      {/* ================= TICKER ================= */}
      <Ticker />

      {/* ================= STATS ================= */}
      <section style={{ background: "var(--ng-navy)" }}>
        <div
          className="ng-wrap ng-stats"
          style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, padding: "2.75rem 1.5rem" }}
        >
          {heroStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div style={{ textAlign: "center" }}>
                <div className="ng-mono" style={{ fontSize: "clamp(1.7rem, 3.6vw, 2.4rem)", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.86rem", color: "rgba(255,255,255,0.68)" }}>
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= WHY CHOOSE / FEATURES ================= */}
      <section className="ng-section">
        <div className="ng-wrap">
          <SectionHeading eyebrow="Why Nivesh Guruji" title="Built for traders, not gatekeepers" />
          <div className="ng-why" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 22, marginTop: "3rem" }}>
            {whyChoose.map((v, i) => {
              const Icon = featureIcons[i % featureIcons.length];
              return (
                <Reveal key={v.title} delay={i * 0.07}>
                  <div className="ng-card" style={{ padding: "2rem", height: "100%" }}>
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: 12,
                        display: "grid", placeItems: "center",
                        background: "var(--ng-gold-soft)", color: "var(--ng-gold-dark)",
                      }}
                    >
                      <Icon size={24} strokeWidth={2} />
                    </div>
                    <h3 style={{ fontSize: "1.35rem", marginTop: "1.1rem" }}>{v.title}</h3>
                    <p className="ng-muted" style={{ marginTop: "0.7rem", lineHeight: 1.65 }}>{v.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PAYOUTS MARQUEE ================= */}
      <section className="ng-section ng-section-alt" style={{ padding: "3.5rem 0" }}>
        <div className="ng-wrap" style={{ marginBottom: "2rem" }}>
          <SectionHeading eyebrow="Real payouts, real traders" title="Money out the door, every day" />
        </div>
        <PayoutMarquee />
      </section>

      {/* ================= CHALLENGE SELECTOR ================= */}
      <section className="ng-section" style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative" }}>
          <SectionHeading
            eyebrow="Choose your challenge"
            title="Pick a route, pick a size, get funded"
            intro="Every route is priced in INR and pays out in INR. Adjust the model and account size to see your exact rules and price."
          />
          <div style={{ marginTop: "3rem" }}>
            <ChallengeSelector />
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="ng-section ng-section-alt">
        <div className="ng-wrap">
          <SectionHeading eyebrow="How it works" title="Three steps to funded" />
          <div className="ng-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, marginTop: "2.6rem" }}>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="ng-card" style={{ padding: "1.9rem", height: "100%", position: "relative" }}>
                  <div
                    className="ng-mono"
                    style={{
                      color: "var(--ng-gold-dark)", fontSize: "0.82rem",
                      letterSpacing: "0.1em", fontWeight: 700,
                    }}
                  >
                    {s.n} · {s.kicker}
                  </div>
                  <h3 style={{ fontSize: "1.3rem", marginTop: "0.85rem" }}>{s.title}</h3>
                  <p className="ng-muted" style={{ marginTop: "0.7rem", lineHeight: 1.65 }}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: "2.4rem" }}>
            <Link href="/how-it-works" className="ng-btn ng-btn-ghost">See the full breakdown →</Link>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="ng-section">
        <div className="ng-wrap">
          <SectionHeading eyebrow="Questions, answered" title="Frequently asked questions" center />
          <div style={{ marginTop: "2.6rem" }}>
            <FaqList />
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section style={{ position: "relative", overflow: "hidden", background: "var(--ng-navy)" }}>
        <div
          className="ng-wrap"
          style={{ position: "relative", padding: "5.5rem 1.5rem", textAlign: "center" }}
        >
          <Reveal>
            <span className="ng-eyebrow" style={{ color: "var(--ng-gold)" }}>Your capital is waiting</span>
            <h2
              style={{
                fontSize: "clamp(2.1rem, 4.8vw, 3.4rem)",
                margin: "1.2rem auto 0", maxWidth: 720, color: "#fff",
              }}
            >
              Stop risking your own money. <span className="ng-grad">Trade ours.</span>
            </h2>
            <p style={{ marginTop: "1.2rem", color: "rgba(255,255,255,0.7)", fontSize: "1.08rem", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              Join 38,000+ funded traders. Your evaluation takes minutes to start.
            </p>
            <div style={{ marginTop: "2.3rem" }}>
              <Link href="/challenges" className="ng-btn ng-btn-gold">Start your challenge →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px){
          .ng-hero { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .ng-stats { grid-template-columns: repeat(2,1fr) !important; }
          .ng-why, .ng-steps { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px){ .ng-stats { grid-template-columns: 1fr !important; gap: 24px !important; } }
      `}</style>
    </>
  );
}
