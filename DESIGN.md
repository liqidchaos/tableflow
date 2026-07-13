# TableFlow Design System

Current design tokens, marketing UI patterns, and shared component conventions for the **existing** TableFlow codebase. This documents what is implemented today, not a greenfield redesign.

For product context, see [`docs/greenfield-ui-ux-brief.md`](docs/greenfield-ui-ux-brief.md). **Note (2026-07-13):** that brief still mentions an older Flow-pink direction; **shipped UI is gold flagship / dark luxury** — this file wins for implementation.

**Source of truth:** `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`, `packages/ui/src/`, `apps/web/src/components/marketing/`, `apps/web/src/components/guest/`.

**Last UX audit:** [TAB-12](/TAB/issues/TAB-12) (guest scan→order→pay + this doc sync).

---

## 1. Design philosophy

TableFlow UI follows an **institutional fine-dining / flagship** direction:

- **Dark luxury base:** charcoal surfaces (`luxury-bg`, `luxury-surface-*`) carry guest, marketing, auth, and dashboard chrome.
- **One accent:** Gold (`#f2ca50` / `--color-gold`). Legacy token `--color-flow` is **aliased to gold** so older `flow` class names still compile.
- **Serif display:** Playfair Display for brand wordmarks and guest/menu headings; Space Grotesk remains available as `--font-display` for denser UI.
- **Image-led proof:** full-bleed photography on marketing; guest mosaic cards use dish photography with gradient scrims.
- **Operational tone:** premium and trustworthy. Guest copy is calm and service-led (“Call server”, pay-before-kitchen). Avoid venue-specific role labels (e.g. “Sommelier”) unless product makes them configurable.
- **Breathing guest density; denser floor/KDS.**

Primary CTAs use **gold filled** (`btn-flagship-primary` / `Button` with `accentColor`) with `gold-on` (`#241a00`) label text. Ghost/outline CTAs use gold borders on dark surfaces.

---

## 2. Color palette

All colors are defined as CSS custom properties in `globals.css` and exposed to Tailwind via `tailwind.config.ts` (`gold`, `flagship.*`, `luxury.*`, and legacy `flow` aliases).

### Brand colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-gold` | `#f2ca50` | `gold` | Primary accent: wordmarks, active chips, totals, primary CTAs |
| `--color-gold-container` | `#d4af37` | `gold-container` | Gradient CTA end / deeper gold |
| `--color-gold-on` | `#241a00` | `gold-on` | Text on gold fills |
| `--color-gold-glow` | `rgba(212,175,55,0.15)` | (CSS) | Soft gold glow / shadows |
| `--color-flow` | `#f2ca50` | `flow` | **Alias of gold** — prefer `gold` in new guest work |
| `--color-flow-light` | `rgba(242,202,80,0.12)` | `flow-light` | Soft gold tint backgrounds |
| `--color-flow-dark` | `#d4af37` | `flow-dark` | Alias of gold-container |
| `--color-citrus` | `#6FCF3C` | `citrus` | Success / ready (`StatusPill`) |
| `--color-citrus-light` | `rgba(111,207,60,0.12)` | `citrus-light` | Success tints |
| `--color-sun` | `#f2ca50` | `sun` | Warning / in-progress (shares gold in flagship) |
| `--color-sun-light` | `rgba(242,202,80,0.12)` | `sun-light` | Warning tints |
| `--color-grape` | `#99907c` | `grape` | Secondary muted accent (not purple) |
| `--color-grape-light` | `rgba(153,144,124,0.12)` | `grape-light` | Grape tints |

### Neutrals (flagship dark)

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-ink` | `#e5e2e1` | `ink` | Primary text on dark (inverted from older light theme) |
| `--color-paper` | `#131313` | `paper` | Page background (dark) |
| `--color-surface` | `#1c1b1b` | `surface` | Elevated panels |
| `--color-border` | `#4d4635` | `border` | Dividers / input borders |

### Luxury / flagship surface scale

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-luxury-bg` | `#131313` | `luxury-bg` / `flagship-background` | Page canvas, `.guest-dark` |
| `--color-luxury-surface-low` | `#1c1b1b` | `luxury-surface-low` | Sheets, sidebar |
| `--color-luxury-surface-high` | `#2a2a2a` | `luxury-surface-high` | Raised cards, totals |
| `--color-luxury-on-surface` | `#e5e2e1` | `luxury-on-surface` | Primary text |
| `--color-luxury-on-surface-variant` | `#d0c5af` | `luxury-on-surface-variant` | Secondary text |
| `--color-luxury-outline-variant` | `#4d4635` | `luxury-outline-variant` | Chip / input borders |

### Semantic / utility

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| `--color-muted` | `#d0c5af` | `muted` | Body secondary |
| `--color-muted-light` | `#99907c` | (CSS) | Fine print |
| `--color-error` | `#ffb4ab` | `error` | Error text, destructive — **not gold** |
| `--color-error-light` | `rgba(255,180,171,0.12)` | (CSS) | Error surfaces |

### Legacy aliases

| Alias | Maps to |
|-------|---------|
| `--color-ember`, `--color-primary` | gold / flow |
| `--color-success` | `--color-citrus` |
| `--color-warning` | `--color-gold` |

### KDS palette

Aligned to flagship dark; accent uses gold.

| Token | Hex | Purpose |
|-------|-----|---------|
| `--kds-bg` | `#131315` | KDS page background |
| `--kds-card` | `#201f1f` | Ticket cards |
| `--kds-border` | `#4d4635` | Borders |
| `--kds-text` | `#e5e2e1` | Primary text |
| `--kds-green` | `#22C55E` | Ready |
| `--kds-yellow` | `#f2ca50` | In progress |
| `--kds-red` | `#ffb4ab` | Urgent / error |
| `--kds-done` | `#353534` | Completed |
| `--kds-accent` | gold | Accent |

### Usage rules

1. **Default canvas:** `luxury-bg` / `.guest-dark`. Do not reintroduce light paper for guest web.
2. **Accent discipline:** gold only for brand, active states, and primary money CTAs. Errors use `--color-error`.
3. **Venue `brand_color`:** may tint CTAs/chips; avoid rewriting global `--color-flow` for the whole session when it fights gold chrome (see TAB-12 P2).
4. **Focus states:** gold border + soft gold ring (see `.input` in `globals.css`).
5. **Contrast:** gold and muted-on-dark pass WCAG AA body sizes in current tokens; verify any new muted-on-scrim combos.

### Cross-surface (mobile)

`apps/mobile/src/lib/theme.ts` should mirror gold + dark neutrals. Prefer Expo fonts that match Playfair / Inter / Space Grotesk roles when updating mobile.

---

## 3. Typography

### Font families

Loaded in `globals.css` via Google Fonts:

| Role | Family | CSS variable | Tailwind | Weights |
|------|--------|--------------|----------|---------|
| Serif display | Playfair Display | `--font-serif` | `font-serif` | 300–900 + italic |
| UI display | Space Grotesk | `--font-display` | `font-display` | 300–700 |
| Body | Inter | `--font-sans` | (default body) | 400, 500, 600 |
| Labels / stats | JetBrains Mono | `--font-mono` | `font-mono` | 600 |

Guest and marketing headings prefer **Playfair** (`font-serif font-light`). Body uses Inter at `--text-body` (15px). `.label-caps` uses mono uppercase tracking for chips and eyebrows.

### Marketing type scale

| Token / class | Size | When to use |
|---------------|------|-------------|
| `text-hero` | `clamp(2.5rem, 6.5vw, 5.5rem)` | Page hero H1 (homepage, pricing) |
| `text-section` | `clamp(2rem, 4.5vw, 3.25rem)` | Section H2s |
| `text-display` | `clamp(2.75rem, 8vw, 7rem)` | Large metrics numerals |
| Step numbers | `clamp(3rem, 8vw, 5.5rem)` | How-it-works background numerals |
| Step titles | `clamp(1.5rem, 3vw, 2rem)` | How-it-works H3s |
| Plan price (teaser) | `clamp(2.5rem, 5vw, 3.5rem)` | Pricing teaser cards |
| Body (marketing) | `15px` / `md:17px` | Section descriptions |
| Eyebrow | `font-mono text-[11px] uppercase tracking-widest` | Section labels ("How it works", "Kitchen display") |
| Fine print | `font-mono text-[10px] uppercase tracking-wider` | Trust lines, stat captions |

### App / dashboard scale (CSS variables)

Used on login, register, guest web, and dashboard:

| Token | Size |
|-------|------|
| `--text-h1` | 28px |
| `--text-h2` | 22px |
| `--text-h3` | 18px |
| `--text-body` | 15px |
| `--text-body-sm` | 13px |
| `--text-label` | 11px |
| `--text-price` | 17px |

### Tracking and leading conventions

- Display headings: `leading-[1.02]` to `leading-[1.05]`, `tracking-[-0.03em]`
- Section titles: `text-balance` for even line breaks
- Mono labels: `uppercase`, `tracking-widest` or `tracking-wider`, weight 600

---

## 4. Spacing and layout

### Spacing scale

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Tailwind spacing uses the same values where mapped (e.g. `p-6` = 24px).

### Layout primitives

| Class / token | Definition | Usage |
|---------------|------------|-------|
| `.marketing-container` | `max-width: 1200px`, centered, horizontal padding `--space-6` | All marketing content width |
| `.section-padding` | vertical `--space-12` | Legal pages, pricing page shell |
| `.section-padding-lg` | vertical `--space-16` | Available, rarely used |
| `.section-padding-xl` | `clamp(5rem, 10vw, 8.75rem)` vertical | Major homepage sections |
| `--section-max` | 1200px | Same as marketing container |
| `--nav-height` | 72px | Fixed header; hero uses `-mt-nav` and `pt-[calc(var(--nav-height)+…)]` |

Tailwind helpers: `max-w-section`, `h-nav`, `pt-nav`.

### Breakpoints

Tailwind defaults. Photo sections add explicit adjustments:

| Breakpoint | Photo behavior |
|------------|----------------|
| default (< 768px) | Stacked layout; photo anchored bottom; text column narrow (`max-w-[17.5rem]`) |
| `md` (768px+) | Two-column grid; photo repositions (hero: 78% center; KDS/floor: 62% center) |
| `lg` (1024px+) | Hero photo at 84% center |

### Grid patterns (photo sections)

Hero, KDS, and floor sections share a layout pattern:

```
section (relative, min-h-[100svh])
  Parallax (absolute inset-0)
    .hero-photo | .kds-photo | .floor-photo
  content (relative z-10, marketing-container)
    grid: mobile stacked | md: text column + empty spacer for photo
```

Mobile reserves `min-h-[42svh]` spacer so copy sits above the visible photo area.

### Border radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small UI |
| `--radius-md` | 12px | Inputs, sidebar links |
| `--radius-lg` | 20px | Cards |
| `--radius-xl` | 24px | Sheet top corners, pricing cards |
| `--radius-full` | 9999px | Buttons, badges, pills |

### Shadows

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Subtle elevation |
| `--shadow-md` | Default cards |
| `--shadow-lg` | Hover cards, sheets |
| `--shadow-flow` | Primary pink button glow |

### Transitions

`--transition-spring`: `200ms cubic-bezier(0.34, 1.56, 0.64, 1)`  
Tailwind: `ease-spring`, `duration-200`.

---

## 5. Components

### Shared UI (`@tableflow/ui`)

Location: `packages/ui/src/`. Inline styles reference CSS variables. Used across marketing, guest web, auth, and dashboard.

#### Button

- **Variants:** `primary` (flow pink + shadow), `secondary` (ink outline), `ghost` (text only)
- **Shape:** pill (`border-radius: full`), padding `12px 24px`, min-width 140px on primary
- **Font:** Space Grotesk, 600, 15px
- **Hover:** `translateY(-1px) scale(1.02)` unless disabled/loading
- **Props:** `loading`, `accentColor` (overrides primary background)
- **Marketing override:** nav and hero often pass `style={{ background: 'var(--color-ink)', boxShadow: 'none' }}`

#### Card

- White surface, `--radius-lg`, `--shadow-md`, padding `--space-5`
- Optional `hoverable` lift on hover
- Global `.card` class in `globals.css` duplicates base styles for auth forms

#### Badge

- **Variants:** `solid`, `outline`
- **Colors:** `flow`, `citrus`, `sun`, `grape`, `ink`
- JetBrains Mono, 11px, uppercase, pill shape
- Used on pricing page for "Most popular" (`color="grape"`)

#### StatusPill

- **Tones:** `ready` (citrus), `progress` (sun), `neutral` (ink), `cancelled` (error light)
- **Sizes:** `sm`, `md`, `lg`
- Helpers: `orderStatusTone()`, `orderStatusLabel()`
- Used in `AuthBrandPanel` demo card and guest/order flows

#### Sheet

- Bottom sheet modal: backdrop `rgba(22, 21, 28, 0.45)`, slide-up spring animation
- Drag handle bar, `--radius-xl` top corners, max height 90vh
- Used in guest web (cart, payment, requests)

#### Logo / LogoWordmark

- **Logo:** rounded square + corner notch circle (abstract table-from-above)
- Default color: flow pink
- **LogoWordmark:** Logo + "TableFlow" in Space Grotesk 700, 22px
- Used in nav, footer, auth panel

#### MenuItemCard / OrderStatusBar

Guest web components. Same tokens (surface, radius-lg, shadow-md, flow accent). Not used on marketing pages.

### Global utility classes (`globals.css`)

| Class | Purpose |
|-------|---------|
| `.input` | Full-width form input with flow focus ring |
| `.sidebar-link` | Dashboard nav link; active state uses flow-light bg |
| `.text-balance` | Balanced headline wrapping |

### Marketing shell: `MarketingChrome`

Wraps all `(marketing)` routes via `apps/web/src/app/(marketing)/layout.tsx`.

- **Fixed nav** (72px): transparent at top, frosted white + border on scroll (`scrollY > 8`)
- **Nav links:** Pricing, Sign in
- **Primary CTA:** ink Button "Start free trial" → `/register`
- **Mobile:** hamburger menu, full-width drawer
- **Footer:** LogoWordmark, copyright, Pricing / Terms / Privacy / Support links

### Marketing sections

| Component | File | Notes |
|-----------|------|-------|
| `HeroSection` | `HeroSection.tsx` | Photo hero, Reveal + Parallax, dual CTAs |
| `HowItWorksSection` | `HowItWorksSection.tsx` | 5 steps, alternating layout, step PNG icons |
| `KdsSection` | `KdsSection.tsx` | Dark photo overlay, white type |
| `FloorSection` | `FloorSection.tsx` | Light photo overlay, ink type |
| `MetricsStrip` | `MetricsStrip.tsx` | Ink background, CountUp metrics |
| `PricingTeaser` | `PricingTeaser.tsx` | Two plan cards, simplified vs full pricing page |
| `FinalCTA` | `FinalCTA.tsx` | Ink section, flow + ghost buttons |
| `PricingCards` | `PricingCards.tsx` | Full pricing cards with Lucide icons, FadeUp |
| `MarketingFAQ` | `MarketingFAQ.tsx` | Accordion, FadeUp |
| `AuthBrandPanel` | `AuthBrandPanel.tsx` | Split-panel left column for login/register |
| `FadeUp` | `FadeUp.tsx` | Simpler scroll fade (pricing, FAQ) |

### Eyebrow + headline pattern

Most sections follow:

1. Mono eyebrow (flow, muted, or white/75 depending on background)
2. Display H2 (`text-section`)
3. Muted body paragraph (`max-w-md` or `max-w-xl`)

### CTA hierarchy

| Context | Primary | Secondary |
|---------|---------|-----------|
| Hero | Ink "Start 30-day free trial" | Outline "Book a demo" (mailto) |
| Nav | Ink "Start free trial" | (none) |
| Pricing cards | Flow primary Button | Ghost + ink border (non-highlighted plan) |
| Final CTA | Flow "Start free trial" | Ghost white outline "See pricing" |

---

## 6. Motion

Built with **Framer Motion**. All motion components respect `useReducedMotion()` and render static content when reduced motion is preferred.

### Reveal / RevealItem

Location: `apps/web/src/components/marketing/motion/Reveal.tsx`

- **Container:** staggers children (default `stagger: 0.1`, configurable `delay`)
- **Items:** fade up 28px, 6px blur clearing, 0.65s, ease `[0.22, 1, 0.36, 1]`
- **Trigger:** `whileInView` with `once: true`, `margin: '-80px'`
- **`immediate`:** animates on mount (hero only)
- Used across homepage sections

### FadeUp

Location: `apps/web/src/components/marketing/FadeUp.tsx`

- Simpler single-element fade: 24px up, 0.5s, same easing
- Viewport margin `-80px`
- Used on pricing page and FAQ

### Parallax

Location: `apps/web/src/components/marketing/motion/Parallax.tsx`

- Background drift tied to scroll progress through section
- Default `amount: 0.08` (8% vertical drift)
- Inner layer oversized to prevent edge gaps
- Wrap with `className="absolute inset-0 overflow-hidden"`
- Static wrapper when reduced motion is on

### CountUp

Location: `apps/web/src/components/marketing/motion/CountUp.tsx`

- Animates numerals on viewport entry (1.6s default)
- Supports `prefix`, `suffix`, `decimals`
- Shows final value immediately when reduced motion is on
- Used in `MetricsStrip`

### Other motion

- Hero scroll chevron: bounce animation, fades in after 1.1s delay
- Sheet: CSS keyframes `sheetFadeIn`, `sheetSlideUp`
- Pricing cards: Tailwind `hover:-translate-y-1` with `ease-spring`
- Button hover: inline transform on mouse enter/leave

### Easing reference

Standard marketing ease: `cubic-bezier(0.22, 1, 0.36, 1)`  
Spring (Tailwind/buttons): `cubic-bezier(0.34, 1.56, 0.64, 1)`

---

## 7. Photo-background sections

Defined as component classes in `globals.css` `@layer components`.

### `.hero-photo`

- **Image:** `/marketing/guest-phone-table.png`
- **Background:** `#0a0a0a`, `cover`, `min-height: 100svh`
- **Overlay:** dual linear gradients from paper (`#FAFAF9`) for readable ink text on the left
- **Position:** mobile bottom-left (`6% 100%`); md+ shifts photo right (`78%` / `84%` at lg)
- **Used in:** `HeroSection`

### `.kds-photo`

- **Image:** `/marketing/kitchen-display.png`
- **Background:** `#0a0a0a`, `100% auto`, bottom on mobile
- **Overlay:** dark ink gradients (`rgba(10, 10, 10, …)`) for white text on the left
- **Position:** mobile bottom; md+ `62% center`
- **Used in:** `KdsSection`

### `.floor-photo`

- **Image:** `/marketing/floor-view.png`
- **Same structure as hero-photo** (light paper gradients, ink text)
- **Used in:** `FloorSection`

### `.hero-mesh`

Gradient mesh on paper (flow, grape, citrus radials). Defined but **not currently used** on the live homepage. Available for alternate hero treatments.

### Implementation checklist

1. Section: `relative min-h-[100svh] overflow-hidden`
2. Parallax wrapper: `absolute inset-0 overflow-hidden`
3. Photo div: `hero-photo h-full w-full` (or kds/floor variant), `aria-hidden`
4. Content: `relative z-10` with `marketing-container`

---

## 8. Marketing information architecture

### Homepage (`apps/web/src/app/(marketing)/page.tsx`)

Section order:

1. **Hero** (`HeroSection`): promise, trial CTAs, trust line
2. **How it works** (`HowItWorksSection`): 5 steps (Scan → Order → Pay → Kitchen fires → Request/reorder)
3. **Kitchen display** (`KdsSection`): paid-first, real time, age tracking
4. **Operator floor** (`FloorSection`): live status, routing, add-ons
5. **Metrics** (`MetricsStrip`): setup time, zero downloads, fee cap
6. **Pricing teaser** (`PricingTeaser`): Starter vs Growth, link to full pricing
7. **Final CTA** (`FinalCTA`): trial signup

All wrapped in `MarketingChrome` (nav + footer).

### Other marketing routes

| Route | Content |
|-------|---------|
| `/pricing` | Hero, `PricingCards`, platform fee callout, `MarketingFAQ` |
| `/privacy`, `/terms` | Prose legal content in `marketing-container max-w-prose` |
| `/login`, `/register` | Split layout: `AuthBrandPanel` + form card (no `MarketingChrome`) |

### Auth layout

Login and register use a two-column grid: ink brand panel (left) + paper form area (right). Forms use global `.card` and `.input` classes.

---

## 9. Assets

### Marketing photography (`apps/web/public/marketing/`)

| File | Used by |
|------|---------|
| `guest-phone-table.png` | `.hero-photo` |
| `kitchen-display.png` | `.kds-photo` |
| `floor-view.png` | `.floor-photo` |

Full-bleed PNGs. Referenced as `/marketing/...` from CSS background-image.

### Step icons (`apps/web/public/icons/`)

| File | Step |
|------|------|
| `step-scan.png` | 01 Scan |
| `step-order.png` | 02 Order |
| `step-pay.png` | 03 Pay |
| `step-kitchen.png` | 04 Kitchen fires |
| `step-request.png` | 05 Request/reorder |

52×52px, rendered with `rounded-full shadow-sm` in How it works.

### Brand

| File | Usage |
|------|-------|
| `logo.svg` | Static SVG asset |
| `Logo` component | Inline SVG logomark (preferred in UI) |

### Icons in UI

- **Lucide React** for nav menu, FAQ chevrons, pricing feature icons
- Step icons are raster PNGs, not Lucide

---

## 10. Copy rules

1. **No em dashes** in user-facing copy. Use commas, periods, or middle dots (`·`) for separators.
2. **Core promise:** "From scan to paid, in one tap" (hero headline variant uses comma: "From scan to paid, in one tap").
3. **Payment-before-kitchen:** always state that payment clears before the kitchen sees tickets.
4. **Trial messaging:** "30-day free trial · No credit card · No POS required" (middle dots, not em dashes).
5. **Tone:** operational, confident, short sentences. Avoid jargon unless audience is operators.
6. **Apostrophes:** use `&apos;` in JSX string literals where needed.

---

## 11. Scope: marketing vs guest vs dashboard

### In scope for this design system (documented here)

| Surface | Path / package | Design coverage |
|---------|----------------|-----------------|
| Marketing site | `apps/web/src/app/(marketing)/`, `components/marketing/` | Full: tokens, motion, photo sections, chrome |
| Auth entry | `/login`, `/register`, `AuthBrandPanel` | Shared tokens + split-panel pattern |
| Shared primitives | `@tableflow/ui`, `globals.css` | Buttons, cards, badges, sheets, logo |
| Guest web | `/g/[code]`, `components/guest/` | `.guest-dark` canvas; `GuestShell`; mosaic menu; dark `Sheet`s (cart, item, pay, requests); gold CTAs |
| Mobile app | `apps/mobile/src/lib/theme.ts` | Same hex tokens, platform-specific fonts |

### Partially in scope (uses tokens, not marketing patterns)

| Surface | Notes |
|---------|-------|
| Operator dashboard | `(dashboard)` routes, `.sidebar-link`, legacy `ember` aliases. Functional UI, not image-led. |
| KDS | Separate dark `--kds-*` palette. Real-time ticket wall, not marketing styled. |

### Out of scope (unless explicitly requested)

- Full dashboard redesign
- KDS app UI overhaul (functional dark theme exists)
- Deep POS integration flows
- Email template redesign
- Greenfield redesign proposals (see `docs/greenfield-ui-ux-brief.md`)

### Where to change what

| Goal | Files |
|------|-------|
| Add or edit a color token | `apps/web/src/app/globals.css`, then `tailwind.config.ts` |
| New marketing section | `apps/web/src/components/marketing/`, compose with `Reveal` + `marketing-container` |
| Shared component | `packages/ui/src/` |
| Mobile token sync | `apps/mobile/src/lib/theme.ts` |
| New marketing photo | `apps/web/public/marketing/`, new class in `globals.css` following hero/kds/floor pattern |

---

## Quick reference: file map

```
apps/web/src/app/globals.css          # Tokens, layout classes, photo sections
apps/web/tailwind.config.ts           # Tailwind extensions
apps/web/src/components/marketing/    # Homepage and marketing sections
apps/web/src/app/(marketing)/         # Marketing routes and layout
packages/ui/src/                      # Shared Button, Card, Badge, etc.
apps/mobile/src/lib/theme.ts          # Mobile token mirror
apps/web/public/marketing/            # Hero, KDS, floor photography
apps/web/public/icons/                # How-it-works step icons
docs/greenfield-ui-ux-brief.md        # Product context (not current implementation spec)
```
