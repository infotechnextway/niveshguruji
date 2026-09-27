"use client";

import { motion, useReducedMotion, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { inr } from "@/lib/funded/format";

// A rising equity curve as an SVG path that draws itself in.
const W = 520;
const H = 300;
const points = [
  [0, 250], [60, 235], [120, 245], [180, 205], [240, 215],
  [300, 165], [360, 150], [420, 95], [480, 70], [520, 40],
] as const;

const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

export function EquityCurve() {
  const reduce = useReducedMotion();
  const [reward, setReward] = useState(reduce ? 318540 : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduce || started.current) return;
    started.current = true;
    const controls = animate(0, 318540, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => setReward(Math.round(v)),
    });
    return () => controls.stop();
  }, [reduce]);

  return (
    <div className="ng-panel" style={{ position: "relative", padding: "1.4rem", overflow: "hidden" }}>
      {/* Reward readout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div className="ng-muted" style={{ fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Performance reward
          </div>
          <div className="ng-mono ng-up" style={{ fontSize: "1.9rem", fontWeight: 600, marginTop: 4 }}>
            +{inr(reward)}
          </div>
        </div>
        <span className="ng-chip ng-mono" style={{ color: "var(--ng-teal)" }}>▲ Live</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} aria-hidden>
        <defs>
          <linearGradient id="ngArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ng-teal)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--ng-teal)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ngLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ng-teal)" />
            <stop offset="100%" stopColor="var(--ng-gold)" />
          </linearGradient>
        </defs>

        {/* gridlines */}
        {[60, 120, 180, 240].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--ng-line)" strokeWidth="1" />
        ))}

        <motion.path
          d={areaPath}
          fill="url(#ngArea)"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#ngLine)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
        {/* endpoint pulse */}
        <motion.circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="6"
          fill="var(--ng-gold)"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.8 }}
        />
      </svg>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <span className="ng-chip">Profit split 90%</span>
        <span className="ng-chip">Payout in 24h</span>
        <span className="ng-chip">No min. days</span>
      </div>
    </div>
  );
}
