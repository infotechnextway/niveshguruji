// Single source of truth: brand, nav, challenge pricing (INR), payouts, copy.
// Edit here and every page updates.

export const site = {
  name: "Nivesh Guruji",
  short: "NiveshGuruji",
  domain: "niveshguruji.com",
  tagline: "Get funded. Trade big. Keep up to 90%.",
  email: "support@niveshguruji.com",
  phone: "+91 98260 00000",
  city: "Indore, Madhya Pradesh",
  discountCode: "GURU30",
  discountPct: 30,
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "Challenges", href: "/challenges" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Payouts", href: "/payouts" },
  { label: "Contact", href: "/contact" },
];

export const heroStats = [
  { value: "₹72 Cr+", label: "paid to traders" },
  { value: "38,000+", label: "funded traders" },
  { value: "24 hrs", label: "avg. payout time" },
  { value: "90%", label: "max profit split" },
];

// Live ticker (illustrative — wire to a real feed later)
export const ticker = [
  { pair: "GOLD", price: "6,412.7", change: "+0.51%", up: true },
  { pair: "NIFTY", price: "24,318.5", change: "+0.32%", up: true },
  { pair: "USD/INR", price: "86.74", change: "-0.08%", up: false },
  { pair: "BANKNIFTY", price: "51,204.9", change: "+0.44%", up: true },
  { pair: "EUR/USD", price: "1.1416", change: "+0.03%", up: true },
  { pair: "BTC/USD", price: "94,182", change: "-0.21%", up: false },
  { pair: "CRUDE", price: "6,140", change: "+0.66%", up: true },
];

// ---- Challenge models ----
export type ModelId = "instant" | "oneStep" | "twoStep";

export const models: {
  id: ModelId;
  name: string;
  tagline: string;
  badge?: string;
}[] = [
  { id: "twoStep", name: "2-Step", tagline: "Classic evaluation, lowest fee." },
  { id: "oneStep", name: "1-Step", tagline: "One target, then funded.", badge: "Popular" },
  { id: "instant", name: "Instant", tagline: "Skip evaluation. Trade funded today." },
];

// Metric rows shown per model (label → value by model)
export const metricRows: { label: string; values: Record<ModelId, string> }[] = [
  { label: "Phase 1 profit target", values: { twoStep: "8%", oneStep: "8%", instant: "—" } },
  { label: "Phase 2 profit target", values: { twoStep: "5%", oneStep: "—", instant: "—" } },
  { label: "Max daily loss", values: { twoStep: "5%", oneStep: "4%", instant: "3%" } },
  { label: "Max overall loss", values: { twoStep: "10%", oneStep: "6%", instant: "6%" } },
  { label: "Minimum trading days", values: { twoStep: "None", oneStep: "None", instant: "None" } },
  { label: "Time to funded", values: { twoStep: "2 phases", oneStep: "1 phase", instant: "Instant" } },
];

export const rewardRows = [
  { label: "Profit split", value: "Up to 90%" },
  { label: "Payout frequency", value: "Every 14 days" },
  { label: "Consistency rule", value: "None" },
  { label: "Weekend holding", value: "Allowed" },
  { label: "News trading", value: "Allowed" },
  { label: "EAs / algos", value: "Allowed" },
];

// ---- Account sizes & prices (INR, before discount) ----
export const accountSizes: {
  id: string;
  display: string;
  full: string;
  prices: Record<ModelId, number>;
}[] = [
  { id: "5L", display: "₹5L", full: "₹5,00,000", prices: { instant: 8999, oneStep: 3499, twoStep: 2999 } },
  { id: "10L", display: "₹10L", full: "₹10,00,000", prices: { instant: 15999, oneStep: 6499, twoStep: 5499 } },
  { id: "25L", display: "₹25L", full: "₹25,00,000", prices: { instant: 34999, oneStep: 12999, twoStep: 10999 } },
  { id: "50L", display: "₹50L", full: "₹50,00,000", prices: { instant: 59999, oneStep: 22999, twoStep: 19999 } },
  { id: "1Cr", display: "₹1Cr", full: "₹1,00,00,000", prices: { instant: 99999, oneStep: 42999, twoStep: 36999 } },
];

// ---- Live payouts marquee (illustrative) ----
export const payouts = [
  { name: "Rahul S.", city: "Indore", amount: 184320, hrs: "4 hrs" },
  { name: "Meena K.", city: "Pune", amount: 96750, hrs: "2 hrs" },
  { name: "Arjun P.", city: "Delhi", amount: 312075, hrs: "58 min" },
  { name: "Sana R.", city: "Hyderabad", amount: 145000, hrs: "13 min" },
  { name: "Vikram T.", city: "Mumbai", amount: 268400, hrs: "3 hrs" },
  { name: "Neha D.", city: "Jaipur", amount: 78980, hrs: "24 min" },
  { name: "Karan M.", city: "Surat", amount: 226164, hrs: "5 hrs" },
  { name: "Divya N.", city: "Kochi", amount: 133717, hrs: "7 min" },
];

export const whyChoose = [
  {
    title: "Payouts in 24 hours",
    body: "99% of withdrawals are processed within a day, straight to your bank or UPI. No ticket queues, no chasing.",
  },
  {
    title: "Keep up to 90%",
    body: "One of the highest splits in India. Scale your account as you stay consistent and your share climbs with you.",
  },
  {
    title: "Trader-friendly rules",
    body: "No minimum days, no consistency score, weekend holding and news trading allowed. Trade your strategy, not ours.",
  },
  {
    title: "Real Indian markets",
    body: "NSE indices, forex, commodities and crypto CFDs on fast execution, with spreads built for active traders.",
  },
];

export const steps = [
  {
    n: "01",
    kicker: "Evaluation",
    title: "Prove your edge",
    body: "Pick a challenge and account size, hit the profit target while staying inside the drawdown limits. Instant accounts skip this entirely.",
  },
  {
    n: "02",
    kicker: "Get funded",
    title: "Trade a funded account",
    body: "Clear the evaluation and receive a simulated funded account. Trade it like your own and earn real payouts on your performance.",
  },
  {
    n: "03",
    kicker: "Scale",
    title: "Grow your capital",
    body: "Stay consistent and unlock larger account sizes and a higher profit split — up to ₹2 crore in simulated capital.",
  },
];

export const faqs = [
  {
    q: "Is this real money or simulated?",
    a: "You trade on simulated funded accounts. Payouts are real and are paid on your simulated performance, in line with our terms. This is the standard model used by prop firms worldwide.",
  },
  {
    q: "How fast are payouts?",
    a: "Most payouts are processed within 24 hours to your Indian bank account or UPI once approved. The first payout can be requested 14 days after your first funded trade.",
  },
  {
    q: "What can I trade?",
    a: "Index CFDs (Nifty, Bank Nifty), forex majors, gold, crude, and major crypto CFDs. Weekend holding, news trading, and automated strategies are all allowed.",
  },
  {
    q: "What happens if I break a rule?",
    a: "Breaching the daily or overall loss limit ends that account. You keep any approved payouts already made and can start a fresh challenge whenever you like.",
  },
  {
    q: "Do you serve traders across India?",
    a: "Yes. Nivesh Guruji is built for Indian traders, priced in INR, with local payment methods and INR payouts. Support is based in Indore.",
  },
];

export const partnerPerks = [
  { title: "Up to 15% commission", body: "Earn on every challenge your audience buys, for the life of the account." },
  { title: "Real-time dashboard", body: "Track clicks, conversions, and payouts with transparent reporting." },
  { title: "Fast affiliate payouts", body: "Withdraw your commissions on the same 24-hour rails our traders use." },
];
