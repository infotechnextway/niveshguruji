"use client";

import { useState } from "react";
import Link from "next/link";
import { challengePlans, models, site, type ModelId } from "@/lib/funded/site";
import { inr, discounted } from "@/lib/funded/format";

const tabs: { id: ModelId; label: string }[] = [
  { id: "oneStep", label: "Step 1" },
  { id: "twoStep", label: "Step 2" },
  { id: "instant", label: "Instant Funded" },
];

export default function ChallengesPage() {
  const [activeTab, setActiveTab] = useState<ModelId>("oneStep");
  const activeModel = models.find((m) => m.id === activeTab)!;

  return (
    <section className="svc-hero">
      {/* Grid overlay */}
      <div className="svc-grid-overlay" aria-hidden="true" />
      {/* Radial glow */}
      <div className="svc-radial" aria-hidden="true" />

      <div className="svc-container">
        <div className="svc-card">
          {/* Header */}
          <div className="svc-card-header">
            <div>
              <p className="svc-label">Programs</p>
              <h1 className="svc-title">Funded trading programs</h1>
              <p className="svc-subtitle">Explore all evaluation paths and instant funded option before signup.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="svc-tabs" role="tablist">
            {tabs.map((t) => {
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className={`svc-tab${active ? " svc-tab-active" : ""}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Cards grid */}
          <div className="svc-cards-wrap">
            <div className="svc-cards-grid">
              {challengePlans.map((plan) => {
                const base = plan.prices[activeTab];
                const now = discounted(base);
                return (
                  <article key={plan.id} className="svc-plan-card">
                    <div className="svc-plan-glow" aria-hidden="true" />
                    <div className="svc-plan-content">
                      <div>
                        <h3 className="svc-plan-name">{plan.capitalLabel} Challenge</h3>
                        <p className="svc-plan-sub">{activeModel.name} Program</p>
                      </div>
                      <p className="svc-plan-capital">{plan.capitalLabel}</p>
                      <div className="svc-plan-specs">
                        <div className="svc-spec-row">
                          <span className="svc-spec-label">Price</span>
                          <span className="svc-spec-value svc-spec-gold">{inr(now)}</span>
                        </div>
                        <div className="svc-spec-row">
                          <span className="svc-spec-label">Phase profit target</span>
                          <span className="svc-spec-value">{plan.profitTarget[activeTab]}</span>
                        </div>
                        <div className="svc-spec-row">
                          <span className="svc-spec-label">Minimum trading days</span>
                          <span className="svc-spec-value">{plan.minDays[activeTab]}</span>
                        </div>
                        <div className="svc-spec-row">
                          <span className="svc-spec-label">Daily drawdown</span>
                          <span className="svc-spec-value">{plan.dailyDrawdown[activeTab]}</span>
                        </div>
                        <div className="svc-spec-row svc-spec-last">
                          <span className="svc-spec-label">Max drawdown</span>
                          <span className="svc-spec-value">{plan.maxDrawdown[activeTab]}</span>
                        </div>
                      </div>
                      <Link href="/register" className="svc-plan-btn">
                        Select plan
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* Discount code banner */}
        <div className="svc-discount">
          <span>
            Use code <strong>{site.discountCode}</strong> for {site.discountPct}% off — prices shown already include discount
          </span>
        </div>
      </div>

      <style>{`
        .svc-hero {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #030712;
          color: #e2e8f0;
          padding: 2rem 0 4rem;
        }
        .svc-grid-overlay {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.32;
          background-image:
            linear-gradient(to right, rgba(240, 165, 30, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(240, 165, 30, 0.06) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .svc-radial {
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 120% 80% at 50% -25%, rgba(240, 165, 30, 0.12), transparent 52%),
            radial-gradient(ellipse 65% 45% at 100% 20%, rgba(217, 143, 11, 0.08), transparent 50%),
            linear-gradient(180deg, #030712 0%, #0f1623 45%, #030712 100%);
        }
        .svc-container {
          position: relative;
          z-index: 10;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        @media (min-width: 640px) {
          .svc-container { padding: 0 1.5rem; }
        }
        .svc-card {
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(240, 165, 30, 0.15);
          background: rgba(10, 22, 40, 0.55);
          box-shadow: 0 25px 50px -12px rgba(240, 165, 30, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .svc-card-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(240, 165, 30, 0.15);
          background: rgba(3, 7, 18, 0.7);
        }
        .svc-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: rgba(240, 165, 30, 0.9);
        }
        .svc-title {
          margin-top: 4px;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #fff;
        }
        @media (min-width: 640px) {
          .svc-title { font-size: 1.5rem; }
        }
        .svc-subtitle {
          margin-top: 4px;
          font-size: 0.875rem;
          color: #94a3b8;
          max-width: 32rem;
        }
        .svc-tabs {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding: 0.5rem;
          border-bottom: 1px solid rgba(240, 165, 30, 0.15);
          background: rgba(3, 7, 18, 0.5);
        }
        .svc-tab {
          flex-shrink: 0;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          .svc-tab { font-size: 0.875rem; padding: 0.5rem 1rem; }
        }
        .svc-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }
        .svc-tab-active {
          background: rgba(240, 165, 30, 0.15);
          color: #f0a51e;
          box-shadow: 0 0 0 1px rgba(240, 165, 30, 0.35);
        }
        .svc-tab-active:hover {
          background: rgba(240, 165, 30, 0.15);
          color: #f0a51e;
        }
        .svc-cards-wrap { overflow: hidden; }
        .svc-cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          padding: 1.5rem;
          background: rgba(3, 7, 18, 0.3);
        }
        @media (min-width: 640px) {
          .svc-cards-grid { grid-template-columns: repeat(2, 1fr); padding: 1.5rem; }
        }
        @media (min-width: 1024px) {
          .svc-cards-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .svc-plan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(240, 165, 30, 0.15);
          background: linear-gradient(to bottom right, rgba(255,255,255,0.06), rgba(240, 165, 30, 0.04), rgba(15, 23, 42, 0.6));
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .svc-plan-card:hover {
          border-color: rgba(240, 165, 30, 0.4);
          box-shadow: 0 20px 40px -10px rgba(240, 165, 30, 0.15);
        }
        .svc-plan-glow {
          position: absolute;
          top: -2rem;
          right: -2rem;
          width: 8rem;
          height: 8rem;
          border-radius: 50%;
          background: rgba(240, 165, 30, 0.08);
          filter: blur(2rem);
          opacity: 0;
          transition: opacity 0.3s, background 0.3s;
        }
        .svc-plan-card:hover .svc-plan-glow {
          opacity: 1;
          background: rgba(240, 165, 30, 0.14);
        }
        .svc-plan-content {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .svc-plan-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fef3c7;
        }
        .svc-plan-sub {
          margin-top: 4px;
          font-size: 0.875rem;
          color: #cbd5e1;
        }
        .svc-plan-capital {
          font-size: 2.25rem;
          font-weight: 700;
          background: linear-gradient(to right, #f0a51e, #fbbf24);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          line-height: 1.1;
        }
        .svc-plan-specs {
          font-size: 0.875rem;
          color: rgba(226, 232, 240, 0.9);
        }
        .svc-spec-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .svc-spec-last { border-bottom: none; }
        .svc-spec-label {
          min-width: 120px;
          color: #94a3b8;
        }
        .svc-spec-value {
          flex-shrink: 0;
          text-align: right;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }
        .svc-spec-gold { color: #f0a51e; }
        .svc-plan-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: auto;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          background: linear-gradient(to right, #d88f0b, #f0a51e);
          color: #1a1200;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(240, 165, 30, 0.25);
          transition: all 0.2s;
        }
        .svc-plan-btn:hover {
          background: linear-gradient(to right, #f0a51e, #fbbf24);
          box-shadow: 0 8px 20px rgba(240, 165, 30, 0.35);
          transform: translateY(-1px);
        }
        .svc-discount {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
          color: #94a3b8;
        }
        .svc-discount strong {
          color: #f0a51e;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </section>
  );
}
