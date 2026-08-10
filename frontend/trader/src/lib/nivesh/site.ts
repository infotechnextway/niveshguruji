// Single source of truth for nav + page content.
// Edit copy here; components read from it so the site stays consistent.

export const site = {
  name: "Nivesh Guruji",
  domain: "niveshguruji.com",
  tagline: "Investing, explained like a good friend would.",
  email: "hello@niveshguruji.com",
  phone: "+91 98260 00000",
  city: "Indore, Madhya Pradesh",
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Plans", href: "/plans" },
  { label: "Resources", href: "/resources" },
  { label: "Contact", href: "/contact" },
];

export const stats = [
  { value: "42,000+", label: "learners guided" },
  { value: "₹310 Cr", label: "invested with our guidance" },
  { value: "4.9 / 5", label: "average learner rating" },
  { value: "180+", label: "cities across India" },
];

export const values = [
  {
    title: "Plain language, always",
    body: "No finance jargon dropped on you without a translation. If a term needs a dictionary, we explain it in one line before we use it.",
  },
  {
    title: "No sales pressure",
    body: "We don’t earn commissions on what you buy. Our only job is to make you a confident, independent investor — not to push a product.",
  },
  {
    title: "Start from wherever you are",
    body: "Never invested a rupee? Perfect. Already have a demat account and doubts? Also perfect. We meet you at your step, not ours.",
  },
];

export const topics = [
  { title: "SIPs & mutual funds", note: "Start small, stay consistent" },
  { title: "Stocks & the market", note: "Ownership, not gambling" },
  { title: "Tax-saving (80C)", note: "Keep more of what you earn" },
  { title: "Emergency fund", note: "Sleep-at-night money first" },
  { title: "Retirement (NPS, EPF)", note: "Future-you says thanks" },
  { title: "Gold & fixed income", note: "The steady, boring half" },
];

// The one place where numbering is honest: this really is an ordered sequence.
export const steps = [
  {
    n: "01",
    title: "Tell us where you stand",
    body: "A five-minute check-in on your income, goals, and what money-worry keeps you up. No account linking, no judgement.",
  },
  {
    n: "02",
    title: "Learn the few things that matter",
    body: "We cut investing down to the handful of ideas that actually move the needle, taught in short, plain lessons you finish in a sitting.",
  },
  {
    n: "03",
    title: "Build a plan that fits your life",
    body: "Together we turn lessons into a simple monthly plan — how much, into what, and why — sized to your real budget.",
  },
  {
    n: "04",
    title: "Invest, review, repeat",
    body: "You invest through your own broker; we stay on as your guide, reviewing every quarter and adjusting as life changes.",
  },
];

export const faqs = [
  {
    q: "Do you manage my money for me?",
    a: "No. You always stay in control of your own accounts and money. We teach and guide; you decide and act. That independence is the whole point.",
  },
  {
    q: "Do I need money to start?",
    a: "You need curiosity, not capital. Many learners begin a SIP of ₹500 a month. We’ll help you find a number that never strains your budget.",
  },
  {
    q: "Are you SEBI registered?",
    a: "Nivesh Guruji is an investor-education service, not a broker or an advisor that recommends specific securities. For personalised advice we point you to SEBI-registered professionals.",
  },
  {
    q: "What if I already invest?",
    a: "Great — the Guided and Pro plans include portfolio reviews to spot overlap, high fees, and gaps, and to give you a clear second opinion.",
  },
];

export const plans = [
  {
    name: "Beginner",
    price: "Free",
    cadence: "forever",
    blurb: "Everything you need to take the first honest step.",
    features: [
      "The full “Basics” lesson library",
      "Monthly live “ask-anything” session",
      "SIP & goal calculators",
      "Community discussion access",
    ],
    cta: "Start learning",
    featured: false,
  },
  {
    name: "Guided",
    price: "₹499",
    cadence: "per month",
    blurb: "A structured plan and a guide who keeps you on track.",
    features: [
      "Everything in Beginner",
      "Your personal step-by-step roadmap",
      "Two 1-on-1 guidance calls a month",
      "Quarterly portfolio review",
      "Priority answers within 24 hours",
    ],
    cta: "Get guided",
    featured: true,
  },
  {
    name: "Guruji Pro",
    price: "₹1,499",
    cadence: "per month",
    blurb: "For families and serious wealth-building over years.",
    features: [
      "Everything in Guided",
      "Whole-family financial roadmap",
      "Weekly guidance availability",
      "Tax & retirement deep-dives",
      "Dedicated guru, same person every time",
    ],
    cta: "Go Pro",
    featured: false,
  },
];

export const resources = [
  {
    kicker: "Guide",
    title: "The 15-minute guide to your first SIP",
    body: "From “what is a mutual fund” to a live monthly investment, without the jargon detour.",
    read: "15 min read",
  },
  {
    kicker: "Explainer",
    title: "Index funds vs. active funds, settled simply",
    body: "Why boring often wins, and the one number to check before you buy any fund.",
    read: "8 min read",
  },
  {
    kicker: "Worksheet",
    title: "Build your emergency fund in 6 steps",
    body: "A printable plan to reach your sleep-at-night number without feeling the pinch.",
    read: "Worksheet",
  },
  {
    kicker: "Explainer",
    title: "Section 80C, in plain Hindi and English",
    body: "Every tax-saving option under 80C, ranked by how much lock-in you sign up for.",
    read: "10 min read",
  },
  {
    kicker: "Story",
    title: "How Meena went from ₹0 to a real plan",
    body: "A schoolteacher in Indore on starting late, starting small, and starting anyway.",
    read: "6 min read",
  },
  {
    kicker: "Guide",
    title: "Reading a market crash without panic",
    body: "What actually happens to a long-term SIP when headlines turn red — with the math.",
    read: "12 min read",
  },
];

export const testimonials = [
  {
    quote:
      "I’d avoided investing for years because everyone explained it like I already understood it. Here, someone finally started from zero with me.",
    name: "Rahul K.",
    role: "First-time investor, Bhopal",
  },
  {
    quote:
      "The quarterly review caught two overlapping funds I was paying extra for. Paid back the plan in one call.",
    name: "Sneha D.",
    role: "Guided member, Pune",
  },
];
