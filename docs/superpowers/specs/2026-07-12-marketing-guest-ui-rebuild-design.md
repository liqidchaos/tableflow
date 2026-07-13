# Marketing Site + Guest Ordering Flow UI/UX Rebuild — Design

## Context

TableFlow's UI/UX currently feels flat and under-designed across its public-facing surfaces. This is the first of what will likely be multiple redesign sub-projects across the platform. **In scope for this spec:** the marketing site (`apps/web/(marketing)`) and the guest ordering flow, both web (`apps/web/g/[code]`) and native mobile (`apps/mobile`). **Explicitly out of scope:** the restaurant dashboard/back-office (`apps/web/(dashboard)`) and the Kitchen Display System (`apps/web/kds`) — these keep their current design for now and will get their own future brainstorm/spec.

This is a full rebrand: no constraint to keep the current "ember/Fraunces" identity. Direction is bold & energetic, closest in spirit to DoorDash/Uber Eats — vivid color, strong contrast, fast-paced motion — while remaining premium enough to sell a B2B SaaS product to restaurant operators.

## Visual Language (Design Tokens)

### Color

A curated multi-color palette on a clean white base (colors pop against white/near-white, not against a dark theme):

| Token | Hex | Role |
|---|---|---|
| `--color-flow` (Coral) | `#FF4D6D` | Primary brand color. TableFlow's own CTAs/links. **Default** guest-app accent — venues can override this with their own `brand_color`. |
| `--color-citrus` | `#6FCF3C` | Success / "ready" / positive states only (order confirmed, ticket done, table open). Fixed — never overridden by venue branding. |
| `--color-sun` | `#FFB800` | Warning / attention / in-progress states (firing, pending payment). Fixed. |
| `--color-grape` | `#7B5CFA` | Secondary decorative/personality accent — category chips, badges, marketing illustration accents. Used deliberately, not everywhere. Fixed. |
| `--color-ink` | `#16151C` | Text, dark UI blocks (footer, dark marketing sections). |
| `--color-paper` | `#FAFAF9` | Page background. |
| `--color-surface` | `#FFFFFF` | Card/surface background. |
| `--color-border` | `#EAE7E0` | Hairline borders. |

Rule: Coral is *the* action color everywhere and is the only token replaced by a venue's custom `brand_color` in the guest ordering flow. Citrus/Sun carry fixed semantic meaning (never decorative). Grape is the "personality" color — used for accents/tags/illustration, kept deliberate so it stays punchy instead of noisy. Ink/Paper/Surface/Border are the neutral scaffold.

### Typography

- `--font-display`: **Space Grotesk** — headlines, buttons, nav, UI labels. Geometric sans with character, bold without being a display/serif font.
- `--font-sans`: **Inter** (kept) — body copy, longer-form text, readability at small sizes.
- `--font-mono`: **JetBrains Mono** (kept) — prices, timers, order codes, status pills, eyebrow labels. Reinforces "technical-playful."

### Shape & Elevation

- Cards: 20px radius, soft layered shadow (no hard borders as the primary definition).
- Buttons/tags/chips: fully pill-shaped, bold fill, minimal/no outline.
- Inputs: 12px radius, thin border, Coral focus ring.

### Motion

Fast-paced, not slow-fade: ~200ms spring-based transitions, subtle hover lift/scale on cards/buttons, staggered scroll-triggered entrance animations (building on existing `framer-motion` usage via `FadeUp`), snappy tab/filter switching, no sluggish easing.

Single light theme only (no dark mode toggle in this scope).

## Component Primitives (`packages/ui`)

Shared between marketing + guest web; mirrored (same token values, native-appropriate implementation) into `apps/mobile/src/components` with a `theme.ts` source of truth.

- **Button** — pill-shaped. Variants: `primary` (solid Coral, white text, hover/press lift), `secondary` (Ink outline or Ink-on-white), `ghost` (text-only, tertiary actions).
- **Card** — 20px radius, soft shadow, white surface.
- **Badge/Chip** — pill-shaped, mono label. Solid and outline forms. Used for category filters, dietary tags, plan features, "Most popular" flags.
- **StatusPill** *(new)* — maps order/table/ticket states to Citrus (ready/done/open), Sun (in-progress/pending), Ink (neutral/queued). Replaces duplicated ad hoc inline status-color styling currently in `FloorSection`, `KdsSection`, and the guest order-status view.
- **Nav/Header** — sticky, blur-on-scroll (keep current behavior), bold wordmark + logomark, pill primary CTA.
- **Sheet/Modal** — bottom-sheet pattern (Cart/ItemDetail/Payment/Requests) restyled: rounded top corners, drag handle, spring-in animation. Behavior/mechanics unchanged — visual/motion pass only.
- **Input/Search** — 12px radius, Coral focus ring.

## Marketing Site — Page Structure

### Homepage (reworked flow — faster, more scannable, consumer-app pace)

1. **Nav** (per component primitives above).
2. **Hero** — punchier headline (core message unchanged: scan → order → pay, no POS, no app download), dual CTA, restyled phone mockup (Citrus "Live" pill, Grape accent details).
3. **New: "How it works" 3-step strip** — Scan → Order → Kitchen fires → Pay. Each step its own bold color block (Coral/Grape/Citrus) with a large mono step number. Fills a current gap: the page has no 10-second overview before diving into feature depth.
4. **Kitchen Display feature section** — same ticket-board concept, restyled with StatusPill colors instead of ad hoc inline styles.
5. **Floor Sync feature section** — same floor-view concept, restyled with StatusPill.
6. **Metrics strip** — reworked from one dark bar into four bold color-block tiles (one per accent color), big mono numbers.
7. **New: Pricing teaser** — condensed 2-plan comparison strip linking to `/pricing`, surfacing pricing signal before the final CTA (currently pricing only lives on a separate page).
8. **Final CTA** — bold Coral→Grape gradient block (currently plain white) as the highest-contrast moment on the page.
9. **Footer** — restyled on an Ink-colored block for grounding contrast.

**Deliberately excluded:** fabricated testimonials/customer logos/star ratings. No fake social proof — straightforward to add once there are real customers to feature.

### Pricing page (`/pricing`)

Same structure (headline → plan cards → platform-fee callout → FAQ), restyled with new tokens. No content rework.

### Privacy / Terms

Legal content — typography/spacing restyled to match the new system; not creatively redesigned.

## Guest Ordering Flow (Web `/g/[code]` + Mobile)

Same tokens/primitives, with the venue's `brand_color` (default Coral) as the primary accent and Citrus/Sun/Grape/Ink fixed as system colors regardless of venue branding.

- **Menu browsing** (`GuestScanPage` / `MenuScreen`) — restyle header, search, category pills, dietary tags, `MenuItemCard`.
  - **Flow fix:** replace the current all-or-nothing `view: 'menu' | 'order'` toggle (placing an order fully replaces the menu view) with a **persistent order-status bar** (StatusPill) pinned above the menu, so guests can keep browsing/ordering while tracking an existing order.
  - **Flow fix:** add a proper empty state (illustration + message) when search/dietary filters return zero items (currently renders nothing).
- **Item detail** (`ItemDetailSheet` / `ItemDetailScreen`) — restyled Sheet primitive; behavior unchanged.
- **Cart** (`CartSheet` / `CartScreen`) — restyled Sheet, Card-per-line-item, mono totals, pill confirm button; expand/collapse mechanic unchanged.
- **Payment** (`PaymentSheet` / `PaymentScreen`) — restyled tokens; Stripe Elements appearance config updated (font/radius/focus color) to match surrounding UI.
- **Order status** — becomes a clear standalone moment: large StatusPill, restyled `OrderStatusBar` progress steps, actions (Add more items / Request something / Pay & close tab) as clear pill buttons instead of stacked mixed-style full-width buttons.
- **Requests** (`RequestsSheet` / `GuestRequestsScreen`) — restyled sheet with icon-forward quick-request buttons instead of plain text buttons.

### Mobile-specific

- Sheets → native modal presentation (slide-up, swipe-to-dismiss) instead of recreated bottom sheets.
- **Scan screen** — full-screen camera view, animated Coral corner-brackets on the scan target, haptic feedback on successful scan.
- **Order status** — treats push notifications (`registerGuestPushNotifications` already exists) as the primary "you don't need to keep this open" signal; in-app screen is the secondary/detail view.
- Typography — add Space Grotesk via Expo Google Fonts, swap out Fraunces; keep Inter.
- New `apps/mobile/src/lib/theme.ts` mirrors the web CSS variables (colors, radii, spacing) as RN's source of truth, so web and mobile can't silently drift apart.

## Logomark

Abstract "table-from-above" motif: a rounded square (the table) with a small notch/dot at one corner (a plate), rendered in Coral, built from the same rounded-shape language as the rest of the UI — no sharp corners, no literal illustration. Must read clearly at 16px (favicon) and at app-icon size. Implemented as an inline SVG/React component for web and exported as static assets for the mobile app icon/favicon.

## Technical Structure

| Area | Location |
|---|---|
| Web design tokens | `apps/web/src/app/globals.css` (`:root`) |
| Shared components | `packages/ui/src/` — extend `Button`, `MenuItemCard`, `OrderStatusBar`; add `Card`, `Badge`, `StatusPill` |
| Marketing components | `apps/web/src/components/marketing/*` (rewritten), + new "how it works" strip + pricing teaser components |
| Guest web components | `apps/web/src/components/guest/*` (restyled); `apps/web/src/app/g/[code]/page.tsx` restructured for persistent status bar |
| Mobile theme | new `apps/mobile/src/lib/theme.ts` |
| Mobile screens | `apps/mobile/src/screens/*` (restyled), native modal presentation for sheets |
| Mobile fonts | swap `@expo-google-fonts/fraunces` → Space Grotesk equivalent; keep Inter |
| Logomark | new `Logo` component (web) + exported SVG/PNG assets (favicon, mobile app icon) |

## Staged Rollout (Approach A)

1. Design tokens + core primitives (`packages/ui`, `globals.css`) validated against one flagship screen (marketing homepage hero).
2. Rest of the marketing site (remaining homepage sections, pricing, privacy, terms).
3. Guest ordering flow, web (`/g/[code]` and all guest sheets).
4. Mobile app (theme mirroring, screens, native-specific polish).

Each stage is independently reviewable and shippable; later stages reuse primitives validated in stage 1, minimizing rework risk.

## Testing

- `apps/web/e2e/smoke.spec.ts` currently asserts text (`"TableFlow"` heading, `"Operator Login"` link) that doesn't match the current homepage — appears pre-existing-stale. Will be fixed to match the new design.
- `apps/web/e2e/order-flow.spec.ts` (guest ordering e2e) needs selector/assertion updates to match the restructured order-status bar, without changing what it verifies functionally.
- Existing unit tests (`guest-cart.test.ts`, mobile `cart.test.ts`, `sessionStorage.test.ts`) test logic, not styling — expected to be unaffected; run after each stage to confirm.
- Manual visual QA via local dev server + browser screenshots at each stage.

## Explicitly Out of Scope

- Dashboard/back-office redesign (`apps/web/(dashboard)`).
- Kitchen Display System redesign (`apps/web/kds`).
- Dark mode / theme toggle.
- Fabricated testimonials or social proof content.
- Backend/API changes — this is a front-end visual and flow layer change only; no changes to session/order/payment API contracts.
