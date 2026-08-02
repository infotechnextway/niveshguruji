# RIDGELINE CAPITAL Frontend — Institutional Modern

This is the third and final design system for the RIDGELINE CAPITAL Paper Trading
Simulator's user + admin web apps. It replaces both the earlier dark-precision
terminal and the Zerodha Kite clone.

## Design pillars

Institutional modern draws its aesthetic from Mercury, Ramp, and Linear —
sophisticated financial and technical products that read as trustworthy without
looking generic. It is:

- **Neutral first.** The palette is a considered gray scale. The single accent
  colour (cobalt) shows up only in navigation, primary actions, focus rings,
  and the challenge card's top edge. The data is what carries visual weight.
- **Restrained typography.** Inter throughout, with `font-variant-numeric:
  tabular-nums` on every number. No monospace-for-numbers switch. Large money
  displays are `font-weight: 300` for elegance.
- **Semantic P&L green/red.** Universal, work in both modes. The green and red
  are Untitled UI's, which are calibrated to feel clinical rather than
  celebratory or catastrophic.
- **Light AND dark, with a real toggle.** Not a marketing bullet — a genuine
  first-class feature. The token system is one CSS file, keyed by
  `data-theme` on `<html>`. Every component reads from tokens, so a single
  attribute flip re-themes the entire app.

## Colour system

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#F7F8FA` | `#0A0C10` |
| `--panel` | `#FFFFFF` | `#12151B` |
| `--panel-2` | `#F1F3F6` | `#1A1E26` |
| `--line` | `#E4E7EC` | `#232830` |
| `--text` | `#0F1114` | `#E7E9EE` |
| `--text-dim` | `#5E6470` | `#8B93A1` |
| `--accent` | `#2D5FE8` (cobalt) | `#5680FF` (brighter cobalt) |
| `--gain` | `#12B76A` | `#22C55E` |
| `--loss` | `#F04438` | `#EF4444` |

Dark-mode accent is brighter deliberately — the same hue at the same lightness
would disappear against the dark canvas.

## Theme mechanics

`ThemeProvider` reads the persisted theme from `localStorage` on mount, falling
back to the user's `prefers-color-scheme`. The provider sets `data-theme` on
`<html>`. `useTheme()` gives components access to the current theme and a
setter.

Critically, an inline script in `<head>` runs **before React hydrates** to
apply the correct theme, so there is no flash-of-white for dark-mode users
loading the page cold.

## Structure

```
frontend/trader/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # ThemeProvider + flash-prevention
│   │   ├── page.tsx                     # → /dashboard
│   │   ├── login/                       # signed-out landing
│   │   ├── dashboard/                   # user dashboard (institutional stats + charts)
│   │   ├── terminal/                    # trading terminal (watchlist/chart/order/positions)
│   │   ├── orders/                      # orders (segmented tabs: open/executed/all)
│   │   ├── holdings/                    # carry-forward positions with invested/current/P&L
│   │   ├── positions/                   # current session positions, intraday + CF
│   │   ├── challenge/                   # detailed challenge view + rules grid
│   │   ├── funds/                       # virtual capital ledger + margin cards
│   │   ├── settings/                    # theme picker + account/trading/security
│   │   └── admin/
│   │       ├── layout.tsx               # sidebar + main area
│   │       ├── page.tsx                 # → /admin/kyc
│   │       ├── kyc/                     # master-detail queue with review panel
│   │       ├── rewards/                 # eligible payouts + approve flow
│   │       ├── users/                   # user table
│   │       ├── plans/                   # plan management with rule detail
│   │       ├── employees/               # employees + roles/RBAC
│   │       ├── config/                  # DB-backed config registry
│   │       ├── audit/                   # write-once audit log
│   │       └── instruments/             # instrument toggle by segment
│   ├── components/
│   │   ├── AppHeader.tsx                # unified user top bar
│   │   ├── ThemeToggle.tsx              # sun/moon toggle
│   │   ├── Icons.tsx                    # 20+ SVG icons
│   │   ├── Watchlist.tsx                # terminal left rail
│   │   ├── Chart.tsx                    # SVG sparkline (TradingView drop-in)
│   │   ├── OrderPanel.tsx               # order ticket (SL XOR Target)
│   │   ├── PositionsPanel.tsx           # terminal positions pane
│   │   ├── RiskMeter.tsx                # daily-drawdown headroom
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx         # sidebar nav with groups + badges
│   │   │   └── AdminTopbar.tsx          # admin page header
│   │   └── dashboard/
│   │       ├── StatCard.tsx             # big-number metric card
│   │       ├── EquityChart.tsx          # equity curve area chart
│   │       ├── ChallengeProgressCard.tsx# signature card (differentiator)
│   │       └── PositionsTable.tsx       # dashboard positions preview
│   ├── lib/
│   │   ├── theme.tsx                    # ThemeProvider + init script
│   │   ├── auth.ts                      # session + demo mode
│   │   ├── api.ts                       # typed API client + envelope
│   │   ├── types.ts                     # shared types
│   │   ├── format.ts                    # paise/price/pct formatters
│   │   ├── quote-store.ts               # zustand quote store
│   │   └── demo-feed.ts                 # synthetic client feed
│   └── styles/
│       └── globals.css                  # design system (light + dark tokens)
```

## Backend integration

The API client (`lib/api.ts`) is real. It:

- Attaches the Bearer token from `getSession()` on every request
- Unwraps the standard `{success, data, error}` envelope
- Throws a typed `ApiError` on failure
- Clears the session on 401

Screens currently show demo data because we haven't run against a live backend
yet. Wiring is one function call per screen — call `api<T>('/challenges/current')`
in a `useEffect`, catch `ApiError`, done. The demo mode (`enterDemoMode()`)
lets the app work fully offline for design review, which is how you're seeing
it now.

Backend proxy configured in `next.config.mjs`:
- `/api/*` → `http://localhost:4000/api/*` (override via `NEXT_PUBLIC_API_ORIGIN`)

## Running

```bash
cd frontend/trader
npm install
npm run dev          # http://localhost:3000
npm run build        # verifies all 22 pages compile
npm run typecheck    # strict TS pass
```

## Route map

**User (top-nav):**
- `/dashboard` — greeting + 4 stat cards + equity chart + challenge card + positions preview
- `/terminal` — watchlist + chart + positions + order ticket
- `/orders` — open/executed/all tabs, cancel action
- `/holdings` — carry-forward positions, invested/current/P&L
- `/positions` — intraday + carry-forward sections, square-off all
- `/challenge` — challenge card + peak/worst stats + equity chart + rules grid
- `/funds` — margin cards + full ledger
- `/settings` — theme picker + account/trading/security

**Admin (sidebar-nav):**
- `/admin/kyc` — pending/review/approved/rejected queue, master-detail
- `/admin/rewards` — eligible/approved/paid/rejected, approve payout flow
- `/admin/users` — searchable user list
- `/admin/plans` — plan management with rule detail panel
- `/admin/employees` — employees + roles + RBAC
- `/admin/config` — grouped config keys with type + description
- `/admin/audit` — write-once audit log
- `/admin/instruments` — segment filter + search + enable/disable

## Verification

- **TypeScript:** `tsc --noEmit` — clean
- **Next.js build:** 22 static pages generated — clean

## What's next

If you go with this direction, we should:

1. Wire real API calls into user dashboard, challenge, positions, orders,
   holdings, funds — one useEffect per screen, catching ApiError
2. Add a real chart library (TradingView Lightweight Charts) into `Chart.tsx`
3. Add WebSocket subscription to the actual `/ws` gateway (currently uses
   client-side synthetic feed)
4. Build the plan-purchase flow (list plans → checkout → payment webhook)
5. Add register/OTP-verify pages for the auth state machine from P1
