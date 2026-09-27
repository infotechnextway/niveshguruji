---
kind: frontend_style
name: CSS-Variable Design System with Tailwind-Free Global Styles and Scoped Funded Theme
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/trader/src/styles/globals.css
    - frontend/trader/src/lib/theme.tsx
    - frontend/trader/src/app/(funded)/funded.css
    - frontend/trader/src/components/AppSidebar.tsx
    - frontend/trader/package.json
---

## What system/approach is used

The frontend (`frontend/trader`) uses a **pure CSS custom properties (variables) design system** without a CSS framework like Tailwind or a component library. Styling is centralized in a single global stylesheet (`src/styles/globals.css`) that defines the entire visual language — colors, typography, spacing, shadows, radii, and semantic tokens — and a separate scoped stylesheet for the marketing "funded" landing area (`src/app/(funded)/funded.css`). Components are styled by applying class names from these files rather than inline styles or CSS-in-JS.

Theme switching is handled via a `data-theme="light" | "dark"` attribute on `<html>` driven by a React `ThemeProvider` (`src/lib/theme.tsx`) that persists the choice to `localStorage` and injects an inline boot script to avoid light/dark flash on first load. The same pattern is used for sidebar collapse state (`data-sidebar="collapsed"`).

Charts are rendered via the `lightweight-charts` library (v4.1.3); chart styling is delegated to that library's theme API rather than CSS variables.

## Key files and packages

- `frontend/trader/src/styles/globals.css` — the single source of truth for the trader UI: CSS variable palette, primitive classes (`.card`, `.btn`, `.input`, `.badge`, `.table`), layout primitives (`.hstack`, `.vstack`, `.gap-*`), shell/sidebar/admin-sidebar components, bottom mobile nav, watchlist master-detail, PWA toast, animations, and responsive breakpoints.
- `frontend/trader/src/lib/theme.tsx` — React context + boot script that sets `data-theme` and `data-sidebar` before hydration, reads `localStorage('pts_theme')` and `prefers-color-scheme`, and exposes `useTheme()` / `ThemeProvider`.
- `frontend/trader/src/app/(funded)/funded.css` — isolated dark-themed design system scoped under `.ng-root` for the marketing/funded pages, with its own palette (gold/teal/indigo), gradients, marquee animation, and responsive rules.
- `frontend/trader/package.json` — dependencies confirm no CSS framework; styling relies on vanilla CSS plus `framer-motion` for motion, `lucide-react` for icons, and `lightweight-charts` for charts.
- `frontend/trader/src/components/AppSidebar.tsx` — demonstrates the convention of composing small BEM-like class names (`.pts-sidebar`, `.pts-sidebar__item`, etc.) defined in globals.css.

## Architecture and conventions

### Design tokens
All visual tokens live as CSS custom properties under `:root, [data-theme="light"]` and `[data-theme="dark"]`:
- Canvas/surfaces: `--bg`, `--panel`, `--panel-2`, `--panel-hover`, `--line`, `--line-strong`, `--line-soft`
- Text: `--text`, `--text-dim`, `--text-faint`, `--text-inverse`
- Semantic: `--gain` / `--gain-soft`, `--loss` / `--loss-soft`, `--warn` / `--warn-soft`, `--info`
- Brand: `--brand-navy`, `--brand-teal`, `--brand-gold`, `--accent`, `--accent-hover`, `--accent-soft`, `--accent-ring`
- Effects: `--shadow-sm/md/lg/panel`, `--r-xs/r/r-md/r-lg`
- Typography: `--ui` (Inter/system stack), `--mono` (JetBrains Mono)

These tokens are consumed everywhere via `var(--name)`; there are no hardcoded color literals in components.

### Primitive layer
`globals.css` defines reusable primitives that components compose:
- `.card`, `.card-lg` — surface containers
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-success` — button variants
- `.input` — form input base
- `.badge`, `.badge-success|danger|warn|info|neutral` — status pills
- `.table`, `.table th|td`, `.table .r` — data tables
- `.num`, `.mono` — numeric/monospace text helpers
- `.hstack`, `.vstack`, `.gap-1..6`, `.grow` — layout flex utilities

### Component-level class naming
Components use a consistent BEM-ish prefix scheme tied to the app domain:
- Trader shell/sidebar: `.pts-shell*`, `.pts-sidebar*`, `.pts-collapse-btn*`
- Admin sidebar: `.admin-sb*`
- Portfolio tabs: `.pf-tabs`, `.pf-tab`
- Watchlist: `.wt*`, `.wt--mobile-list`, `.wt--mobile-detail`
- Bottom nav: `.bottom-nav*`, `.bottom-nav-more*`
- PWA toast: `.pwa-toast*`

This keeps the global namespace organized while avoiding CSS-in-JS scoping issues (the file comments note that some styles had to be moved out of `styled-jsx` because HMR didn't apply them).

### Responsive strategy
Responsive behavior is implemented with plain `@media` queries in `globals.css`:
- Mobile breakpoint at `768px`: hides desktop sidebar, shows `.bottom-nav`, adjusts safe-area insets, switches watchlist to master-detail mode.
- Desktop breakpoint at `769px`: hides bottom nav, positions PWA toast differently.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables transitions/animations globally.

### Marketing/funded sub-theme
The funded landing pages live under `src/app/(funded)/` and import `funded.css`. That stylesheet is fully self-contained under the `.ng-root` scope, defining its own token set (`--ng-bg`, `--ng-gold`, `--ng-teal`, `--ng-indigo`, etc.), gradient text, glow effects, marquee animation, and its own responsive rules. It intentionally diverges from the trader's institutional gray+teal palette to give the marketing site a distinct dark brand identity.

### Chart styling
Charts are built with `lightweight-charts` (installed in `package.json`). Chart appearance is controlled through the library's configuration (e.g., `theme: 'dark'`), not through the global CSS variables. This keeps financial charts visually independent from the rest of the UI.

### Motion
Animations are defined as keyframes in `globals.css` (`flashUp`, `flashDown`, `shimmer`, `ptsSlideIn`, `bottomNavMoreIn`, `pwaToastIn`) and applied via utility classes (`.tick-up`, `.tick-down`, `.skeleton`). For richer interactions, `framer-motion` is available but the core UI relies on CSS transitions and keyframes.

## Conventions and constraints

- **No CSS frameworks**: There is no `tailwind.config.*`, no PostCSS config, no `@import` of external CSS libraries beyond what Next.js provides. All styling is hand-authored CSS.
- **Single source of truth for tokens**: Colors, radii, shadows, and fonts are declared once in `globals.css` under both light and dark themes; components must never hardcode hex values.
- **Theme via `data-theme` attribute**: The `ThemeProvider` writes `data-theme` onto `<html>`; CSS selectors target `[data-theme="dark"]` to swap palettes. The boot script runs before React hydration to prevent flash.
- **Scoped marketing theme**: The funded pages use a completely separate `.ng-root`-scoped stylesheet so it can coexist with the trader app without leaking styles.
- **BEM-like class prefixes per feature**: Sidebar, admin, portfolio, watchlist, bottom nav, and PWA toast each have their own prefix to keep the global stylesheet organized.
- **Mobile-first bottom navigation**: Below `768px` the desktop sidebar is hidden and a fixed bottom tab bar appears; above that breakpoint the bottom nav is hidden.
- **Accessibility hooks**: Focus rings use `:focus-visible` with the accent color; reduced motion is respected; sidebar collapse toggle uses `aria-pressed`; nav items use `aria-current`.
- **Chart styling is delegated**: Charts do not consume the global CSS variables; they are styled through `lightweight-charts` options.