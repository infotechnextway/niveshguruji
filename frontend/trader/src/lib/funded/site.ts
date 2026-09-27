// Single source of truth: brand, nav, challenge pricing (INR), payouts, copy.
// Edit here and every page updates.

export const site = {
  name: "Nivesh Guruji",
  short: "NiveshGuruji",
  domain: "niveshguruji.com",
  tagline: "Trade the World's Capital With Institutional Confidence.",
  email: "support@niveshguruji.com",
  phone: "+91 98260 00000",
  city: "Indore, Madhya Pradesh",
  discountCode: "GURU30",
  discountPct: 30,
  profitSplit: "80%",
  taglineShort: "India's Premier Prop Trading Firm",
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
  { value: "80%", label: "max profit split" },
];

// Live ticker (illustrative — wire to a real feed later)
export const ticker = [
  { pair: "GOLD", price: "6,412.7", change: "+0.51%", up: true },
  { pair: "NIFTY", price: "24,318.5", change: "+0.32%", up: true },
  { pair: "USD/INR", price: "86.74", change: "-0.08%", up: false },
  { pair: "BANKNIFTY", price: "51,204.9", change: "+0.44%", up: true },
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

// Featured funding programs (broker-style cards)
export const fundingPrograms = [
  {
    capital: "₹5L",
    capitalFull: "5 Lakh",
    startingAt: 5999,
    highlights: [
      "5 Lakh Simulated Capital",
      "Up to 80% Profit Split",
      "No Time Limit",
      "Daily Drawdown: 3%",
      "Max Drawdown: 6%",
    ],
    popular: false,
  },
  {
    capital: "₹25L",
    capitalFull: "25 Lakh",
    startingAt: 26999,
    highlights: [
      "25 Lakh Simulated Capital",
      "Up to 80% Profit Split",
      "No Time Limit",
      "Daily Drawdown: 3%",
      "Max Drawdown: 6%",
      "Priority Support",
    ],
    popular: true,
  },
  {
    capital: "₹1Cr",
    capitalFull: "1 Crore",
    startingAt: 104599,
    highlights: [
      "1 Crore Simulated Capital",
      "Up to 80% Profit Split",
      "No Time Limit",
      "Daily Drawdown: 3%",
      "Max Drawdown: 6%",
      "Priority Support",
      "Dedicated Account Manager",
    ],
    popular: false,
  },
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
  { label: "Profit split", value: "Up to 80%" },
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
    title: "Keep up to 80%",
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
    kicker: "Programme",
    title: "Choose an Evaluation Program",
    body: "Select the evaluation program that best matches your trading goals and experience. We offer Phase 1 and Phase 2 tracks to suit different styles.",
  },
  {
    n: "02",
    kicker: "Evaluation",
    title: "Complete the Evaluation",
    body: "Meet the predefined trading objectives and risk parameters in a simulated environment. Demonstrate discipline and consistent risk management.",
  },
  {
    n: "03",
    kicker: "Qualified",
    title: "Become a Qualified Trader",
    body: "Upon successful evaluation, you will receive access to a funded trading account subject to our Terms & Conditions.",
  },
  {
    n: "04",
    kicker: "Payouts",
    title: "Receive Performance-Based Payouts",
    body: "Eligible traders may receive performance-based payouts in accordance with the payout policy and applicable terms.",
  },
];

export const faqs = [
  {
    q: "What is Nivesh Guruji?",
    a: "Nivesh Guruji is a performance-based proprietary trading evaluation platform for traders in India. We combine trading education with simulated challenge accounts (virtual capital) so you can demonstrate discipline and risk management. We are not a brokerage and do not provide investment advice.",
  },
  {
    q: "How does the evaluation work?",
    a: "You trade on simulated accounts with virtual capital. Meet the predefined trading objectives and risk parameters — demonstrate discipline and consistent risk management. Upon success, you become eligible for a funded account.",
  },
  {
    q: "What is the profit split?",
    a: "Eligible traders can earn up to 80% profit split on their simulated trading performance. The split scales as you stay consistent and grow your track record.",
  },
  {
    q: "Is there a time limit?",
    a: "No. There is no arbitrary time pressure on challenges. Trade at your own pace and demonstrate your edge without a countdown.",
  },
  {
    q: "What markets can I trade?",
    a: "Index CFDs (Nifty, Bank Nifty), equity futures & options, forex majors, gold, crude, and major crypto CFDs. Weekend holding, news trading, and automated strategies are all allowed.",
  },
  {
    q: "What happens if I fail the challenge?",
    a: "Breaching the daily or overall loss limit ends that account. You keep any approved payouts already made and can start a fresh challenge whenever you like.",
  },
  {
    q: "How do payouts work?",
    a: "Most payouts are processed within 24 hours to your Indian bank account or UPI once approved. The first payout can be requested 14 days after your first funded trade, subject to KYC and rule compliance.",
  },
  {
    q: "Is Nivesh Guruji registered with SEBI?",
    a: "Nivesh Guruji is not registered with SEBI as an investment advisor, research analyst, stock broker, or portfolio manager. We operate as an EdTech and trading evaluation company providing simulated trading challenges and performance-based evaluation.",
  },
];

export const partnerPerks = [
  { title: "Up to 15% commission", body: "Earn on every challenge your audience buys, for the life of the account." },
  { title: "Real-time dashboard", body: "Track clicks, conversions, and payouts with transparent reporting." },
  { title: "Fast affiliate payouts", body: "Withdraw your commissions on the same 24-hour rails our traders use." },
];

// Testimonials
export const testimonials = [
  {
    name: "Rahul S.",
    city: "Indore",
    text: "Cleared the 25L challenge in 3 weeks. The rules are fair and payouts are genuinely fast — got my first withdrawal in under 24 hours.",
  },
  {
    name: "Meena K.",
    city: "Pune",
    text: "Finally a prop firm that treats Indian traders seriously. INR pricing, UPI payouts, and no hidden rules. Been funded for 4 months now.",
  },
  {
    name: "Arjun P.",
    city: "Delhi",
    text: "The dashboard is clean, execution is fast, and the support team actually responds. Best prop trading experience I've had in India.",
  },
];

// Top traders (illustrative leaderboard)
export const topTraders = [
  { rank: 1, name: "Vikram T.", city: "Mumbai", profit: 485000 },
  { rank: 2, name: "Sana R.", city: "Hyderabad", profit: 372500 },
  { rank: 3, name: "Arjun P.", city: "Delhi", profit: 312075 },
  { rank: 4, name: "Karan M.", city: "Surat", profit: 268400 },
  { rank: 5, name: "Rahul S.", city: "Indore", profit: 184320 },
];
