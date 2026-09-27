import Link from "next/link";
import { Clock, Percent, ShieldCheck, LineChart, Trophy, Star, Users } from "lucide-react";
import { Reveal } from "@/components/funded/Reveal";
import { Eyebrow, SectionHeading, Stat } from "@/components/funded/primitives";
import { Ticker } from "@/components/funded/Ticker";
import { PayoutMarquee } from "@/components/funded/PayoutMarquee";
import { EquityCurve } from "@/components/funded/EquityCurve";
import { ChallengeSelector } from "@/components/funded/ChallengeSelector";
import { FaqList } from "@/components/funded/FaqList";
import { heroStats, whyChoose, steps, challengePlans, topTraders, testimonials, site } from "@/lib/funded/site";
import { inr, discounted } from "@/lib/funded/format";

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
                ★ {site.taglineShort}
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 style={{ fontSize: "clamp(2.6rem, 5.6vw, 4.2rem)", marginTop: "1.4rem" }}>
                Trade the World&apos;s Capital.<br /><span className="ng-grad">With Institutional Confidence.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.13}>
              <p className="ng-muted" style={{ marginTop: "1.4rem", fontSize: "1.18rem", lineHeight: 1.65, maxWidth: 500 }}>
                Prove your edge on our simulated accounts. Pass the challenge, trade funded capital, and earn up to {site.profitSplit} profit splits with zero risk to your own funds.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: "2.2rem" }}>
                <Link href="/challenges" className="ng-btn ng-btn-gold">Start Challenge →</Link>
                <a href="https://discord.gg/RTYBrhuku" className="ng-btn ng-btn-ghost" target="_blank" rel="noopener noreferrer">Join Community</a>
              </div>
            </Reveal>
            <Reveal delay={0.27}>
              <div style={{ display: "flex", gap: 10, marginTop: "1.9rem", flexWrap: "wrap" }}>
                <span className="ng-chip">Up to {site.profitSplit} Profit Split</span>
                <span className="ng-chip">Instant Payouts</span>
                <span className="ng-chip">No Time Limits</span>
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

      {/* ================= FUNDING PROGRAMS ================= */}
      <section className="ng-section" style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative" }}>
          <SectionHeading
            eyebrow="Funding Programs"
            title="Choose Your Challenge"
            intro="Pick a program that matches your trading style. Pass the evaluation and trade with our capital."
          />
          <div className="ng-programs" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, marginTop: "3rem" }}>
            {challengePlans.filter((p: typeof challengePlans[0]) => ["5L", "25L", "1Cr"].includes(p.id)).map((p: typeof challengePlans[0], i: number) => (
              <Reveal key={p.id} delay={i * 0.08}>
                <div className="ng-card ng-program" style={{ padding: "2rem", height: "100%", position: "relative", display: "flex", flexDirection: "column" }}>
                  {p.id === "25L" && (
                    <span style={{ position: "absolute", top: -12, right: 20, background: "var(--ng-gold)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, letterSpacing: "0.04em" }}>
                      MOST POPULAR
                    </span>
                  )}
                  <div className="ng-mono" style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--ng-navy)" }}>{p.display}</div>
                  <div className="ng-muted" style={{ fontSize: "0.9rem", marginTop: 4 }}>{p.full} Simulated Capital</div>
                  <div style={{ marginTop: "1.2rem", marginBottom: "1.2rem" }}>
                    <span className="ng-muted" style={{ fontSize: "0.82rem" }}>Starting at</span>
                    <div className="ng-grad" style={{ fontSize: "1.6rem", fontWeight: 700 }}>{inr(discounted(p.prices.oneStep))}</div>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, flex: 1 }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" }}>
                      <span style={{ color: "var(--ng-teal)", flexShrink: 0 }}>✓</span> {p.full} Simulated Capital
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" }}>
                      <span style={{ color: "var(--ng-teal)", flexShrink: 0 }}>✓</span> Up to 80% Profit Split
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" }}>
                      <span style={{ color: "var(--ng-teal)", flexShrink: 0 }}>✓</span> No Time Limit
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" }}>
                      <span style={{ color: "var(--ng-teal)", flexShrink: 0 }}>✓</span> Daily Drawdown: {p.dailyDrawdown.oneStep}
                    </li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" }}>
                      <span style={{ color: "var(--ng-teal)", flexShrink: 0 }}>✓</span> Max Drawdown: {p.maxDrawdown.oneStep}
                    </li>
                  </ul>
                  <Link href="/challenges" className="ng-btn ng-btn-gold" style={{ marginTop: "1.5rem", justifyContent: "center", width: "100%" }}>
                    Start Challenge
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link href="/challenges" style={{ color: "var(--ng-gold-dark)", fontSize: "0.95rem", fontWeight: 500 }}>
              View all program sizes and detailed pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="ng-section ng-section-alt">
        <div className="ng-wrap">
          <SectionHeading eyebrow="How It Works" title="Your Path to Qualification" intro="Four simple steps from signup to earning profit splits." />
          <div className="ng-steps" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 22, marginTop: "2.6rem" }}>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="ng-card" style={{ padding: "1.9rem", height: "100%", position: "relative" }}>
                  <div className="ng-mono ng-grad" style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>{s.n}</div>
                  <div className="ng-eyebrow" style={{ marginTop: 10, marginBottom: 6 }}>{s.kicker}</div>
                  <h3 style={{ fontSize: "1.2rem", marginTop: "0.2rem" }}>{s.title}</h3>
                  <p className="ng-muted" style={{ marginTop: "0.7rem", lineHeight: 1.65, fontSize: "0.95rem" }}>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: "2.4rem" }}>
            <Link href="/how-it-works" className="ng-btn ng-btn-ghost">See the full breakdown →</Link>
          </div>
        </div>
      </section>

      {/* ================= TOP TRADERS LEADERBOARD ================= */}
      <section className="ng-section" style={{ position: "relative", overflow: "hidden" }}>
        <div className="ng-aura" />
        <div className="ng-wrap" style={{ position: "relative" }}>
          <SectionHeading eyebrow="Leaderboard" title="Top Traders" intro="Our highest performing traders ranked by total profit. Will you be next?" />
          <div className="ng-table-wrap" style={{ marginTop: "2.5rem", overflowX: "auto" }}>
            <table className="ng-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>Rank</th>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>Trader</th>
                  <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)", fontWeight: 500 }}>City</th>
                  <th style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-gold-dark)" }}>Total Profit</th>
                </tr>
              </thead>
              <tbody>
                {topTraders.map((t) => (
                  <tr key={t.rank}>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }}>
                      {t.rank <= 3 ? <span style={{ color: "var(--ng-gold)", fontWeight: 700 }}>#{t.rank}</span> : `#${t.rank}`}
                    </td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", fontWeight: 500 }}>{t.name}</td>
                    <td style={{ padding: "14px 16px", borderBottom: "1px solid var(--ng-line)", color: "var(--ng-muted)" }}>{t.city}</td>
                    <td style={{ textAlign: "right", padding: "14px 16px", borderBottom: "1px solid var(--ng-line)" }} className="ng-up">{inr(t.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="ng-section ng-section-alt">
        <div className="ng-wrap">
          <SectionHeading eyebrow="Testimonials" title="Loved by Traders" intro="Real voices from our community — curated from verified feedback." />
          <div className="ng-testimonials" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, marginTop: "3rem" }}>
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <div className="ng-card" style={{ padding: "2rem", height: "100%" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={16} fill="var(--ng-gold)" color="var(--ng-gold)" />
                    ))}
                  </div>
                  <p className="ng-muted" style={{ lineHeight: 1.7, fontSize: "0.98rem", fontStyle: "italic" }}>“{t.text}”</p>
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--ng-gold-soft)", display: "grid", placeItems: "center", color: "var(--ng-gold-dark)", fontWeight: 700, fontSize: 14 }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{t.name}</div>
                      <div className="ng-muted" style={{ fontSize: "0.8rem" }}>{t.city}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
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
              Prove your edge. <span className="ng-grad">Trade with our capital.</span>
            </h2>
            <p style={{ marginTop: "1.2rem", color: "rgba(255,255,255,0.7)", fontSize: "1.08rem", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              Join 38,000+ funded traders. Start your evaluation in minutes.
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
          .ng-why { grid-template-columns: 1fr !important; }
          .ng-programs, .ng-steps, .ng-testimonials { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px){ .ng-stats { grid-template-columns: 1fr !important; gap: 24px !important; } }
      `}</style>
    </>
  );
}
