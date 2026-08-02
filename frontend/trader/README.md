# RIDGELINE CAPITAL — Trader Web App (Kite-style)

Next.js 14 App Router · TypeScript · `lightweight-charts` · `zustand`.

## Design system

Modeled on **Zerodha Kite**: a light, warm, restrained interface a serious retail trader recognizes on sight. The deliberate departures from a generic broker clone are the elements this platform *has* that Kite doesn't — starting with the challenge card in the corner of every dashboard.

**Palette**
- Canvas `#FBFBFB`, cards `#FFFFFF`, hairline borders `#EDEDED` / `#E0E0E0`
- Text `#212529`, dim `#6E7681`, faint `#A0A6AD`
- P&L: gain `#4CAF50` (with `#E8F5E9` tint), loss `#EF5350` (with `#FFEBEE` tint)
- Brand accent — warm orange `#EA5B2F` (a distinctive tone in the Kite family; used only for the active nav item, primary CTAs, and the challenge card's top rule)

**Typography** — Inter across the whole UI, with `font-variant-numeric: tabular-nums` applied to every number for column alignment. No mono switch — Kite doesn't do it and it's cleaner without.

**Signature element** — the **ChallengeCard** on the right of the dashboard. Two opposing meters (profit-to-target in accent orange, drawdown-used in warn/loss) plus a live status pill. It's what makes this a *challenge* platform rather than a broker.

## Structure

```
src/
  app/
    layout.tsx            root layout, font preloads via <link>
    page.tsx              redirect → /dashboard
    dashboard/page.tsx    Kite-style landing: greeting + equity/commodity + holdings + challenge
    terminal/page.tsx     chart + order panel (light theme)
    login/page.tsx        sign-in card + demo entry
  components/
    Header.tsx            top bar: index chips, brand + watchlist selector, nav, user badge
    Watchlist.tsx         left rail: search + list + numbered 1–7 group tabs
    Chart.tsx             lightweight-charts candlestick (light palette)
    OrderPanel.tsx        Buy/Sell + Market/Limit + one-only SL/Target trigger
    PositionsPanel.tsx    bottom terminal tabs — Positions | Orders
    RiskMeter.tsx         (dark-theme header meter — kept for reuse)
    dashboard/
      EquityCard.tsx      Equity/Commodity summary — Kite pattern
      HoldingsCard.tsx    P&L + current + invested + proportion bar
      ChallengeCard.tsx   SIGNATURE — challenge status, profit + drawdown meters
  lib/
    api.ts                thin fetch client, DEMO flag
    quote-store.ts        zustand store, WS-swappable
    demo-feed.ts          client synthetic feed for offline exploration
    format.ts             paise, price, pct, signClass
    types.ts              Quote, Instrument, ChallengeProgress
  styles/globals.css      design tokens + tick-flash keyframes
```

## Routes

- `/` → `/dashboard`
- `/dashboard` — landing. Left rail (watchlist), main content (equity, holdings, challenge)
- `/terminal` — chart + order flow (accessible from left-rail row click or nav)
- `/login` — sign-in + "Try the demo dashboard"

Without an access token in `localStorage`, the app enters DEMO mode: a client synthetic feed drives prices and orders simulate locally, so designers and traders can explore the full experience with no backend.

## Backend integration

All backend routes exist through P6 and are ready to consume:
- `POST /api/v1/auth/login`
- `GET /api/v1/challenge/current` → ChallengeCard
- `GET /api/v1/market/search`, `/watchlist/:tab` → Watchlist rail
- `GET /api/v1/market/candles`, `wss://…/ws?token=…` → Chart
- `POST /api/v1/orders` → OrderPanel
- `GET /api/v1/portfolio/:challengeId/{positions,holdings,trades}` → dashboard cards + terminal

Swapping from the demo feed to the WebSocket is a single-file change in `lib/quote-store.ts` — the same `quotes` store shape.

## Verified

`npm run typecheck` clean · `npm run build` clean (7 routes, `/dashboard` 107 kB First Load JS, `/terminal` 157 kB). Live serve confirms every dashboard section renders: greeting, Equity + Commodity cards, Holdings block, Challenge card with both meters.

Fonts load via `<link>` at runtime, not `next/font` — chosen so builds succeed in sandboxed/offline environments.
