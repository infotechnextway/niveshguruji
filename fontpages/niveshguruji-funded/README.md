# Nivesh Guruji — funded-trader site

A 5-page proprietary-trading-firm site (**Home · Challenges · How it works ·
Payouts · Contact**) modeled on the sharkfunded.com structure, priced in **INR**,
for the Next.js App Router.

- **Signature:** an interactive **challenge selector** (Instant / 1-Step / 2-Step ×
  ₹5L–₹1Cr) that recomputes rules and price live, with a copy-able discount code
- **Hero:** animated SVG **equity curve** + live price ticker + counting reward
- **Type:** Space Grotesk (display) · Inter (body) · JetBrains Mono (numbers)
- **Theme:** near-black indigo + saffron-gold + profit-teal, scoped under `.ng-root`
- **No Tailwind, no WebGL** — light and easy to drop into an existing app

---

## 1. Install

```bash
npm install framer-motion lucide-react
```

## 2. Copy into your app

Merge these into your project (they use the default `@/` root alias):

```
app/(funded)/          → your app/
components/funded/      → your components/
lib/funded/            → your lib/
```

`(funded)` is a **route group** — the parentheses add no URL segment, so pages
resolve at:

| Page          | URL             |
| ------------- | --------------- |
| Home          | `/`             |
| Challenges    | `/challenges`   |
| How it works  | `/how-it-works` |
| Payouts       | `/payouts`      |
| Contact       | `/contact`      |

> If your app already has a homepage at `/`, rename the group folder (e.g. to
> `funded/`) so everything lives under `/funded`, `/funded/challenges`, etc.

## 3. Run

```bash
npm run dev
```

---

## Where things live

- **All pricing, rules, payouts, copy** → `lib/funded/site.ts`. Change account
  sizes, prices (INR), profit split, discount code, FAQs, and payout figures here.
- **INR formatting & discount math** → `lib/funded/format.ts`.
- **Colours & fonts** → `app/(funded)/funded.css` (CSS variables at the top).
- **Challenge selector** → `components/funded/ChallengeSelector.tsx`.
- **Hero chart** → `components/funded/EquityCurve.tsx`.
- **Forms & "Start challenge" buttons** carry `// TODO` / `#` where you wire in
  your checkout, API route, or app signup URLs.

## Important: this is a prop-firm template

The copy uses the standard, accurate **"simulated funded account"** framing and
includes a risk disclaimer in the footer. Before launching, review all claims,
prices, and figures with your own compliance/legal position for India — the
payout numbers and stats in `site.ts` are illustrative placeholders, not real
records. Wire the ticker and payout tables to real data feeds if you display them
as live.
