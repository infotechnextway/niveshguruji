/** Deterministic demo equity curve — same output on server and client so SSR
 *  hydration never mismatches (no Math.random / Date.now). */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed epoch so timestamps match across SSR and hydration. */
const EPOCH = Date.UTC(2026, 6, 31, 12, 0, 0);

export function makeDemoCurve(
  capital: number,
  days = 30,
  seed = 42,
  endEquity?: number,
): { t: number; v: number }[] {
  const rand = mulberry32(seed);
  const out: { t: number; v: number }[] = [];
  let v = capital;
  for (let i = days; i >= 0; i--) {
    const drift = 300;
    const noise = (rand() - 0.48) * capital * 0.008;
    v = Math.max(capital * 0.94, Math.min(capital * 1.09, v + drift + noise));
    out.push({ t: EPOCH - i * 86_400_000, v: Math.round(v) });
  }
  if (endEquity != null && out.length) {
    out[out.length - 1] = { ...out[out.length - 1], v: endEquity };
  }
  return out;
}
