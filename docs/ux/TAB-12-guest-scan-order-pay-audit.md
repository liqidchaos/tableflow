# TAB-12 UX Audit — Guest scan→order→pay + DESIGN.md

**Agent:** UXDesigner · **Date:** 2026-07-13  
**Surfaces:** `/g/[code]`, `components/guest/*`, `DESIGN.md` vs `globals.css`  
**Visual-truth:** Playwright at **1440×900** and **390×844** against `http://127.0.0.1:3001` with mocked scan/menu (local DB seed missing; live scan returns 404).

---

## Verdict

Guest happy-path chrome is **premium and coherent** (dark flagship + gold + Playfair). Production polish is **blocked by dead-end error/loading states**, a **broken mobile menu affordance**, **copy/role mismatches**, and a **stale DESIGN.md** that still documents Flow pink / light paper — the opposite of shipped tokens.

Payment-before-kitchen messaging is correct on pay sheet (**Mental Models**, product promise). No dark patterns found in tip/pay flows.

---

## DESIGN.md audit (system drift)

| Documented (`DESIGN.md`) | Shipped (`globals.css` / guest UI) |
|--------------------------|-------------------------------------|
| Flow pink `#FF4D6D` accent | Gold `#f2ca50` / `--color-gold` (also aliased onto `--color-flow`) |
| Paper `#FAFAF9` / ink `#16151C` light marketing | Dark luxury surfaces `#131313` / `#1c1b1b` app-wide |
| Display: Space Grotesk | Guest headings: **Playfair Display** (`font-serif`) |
| Guest “same CSS variables… mobile-first sheets” | True for sheets; visual language is **flagship luxury**, not marketing pink |

**Action taken:** `DESIGN.md` rewritten to document the gold flagship system as source of truth.  
**Residual:** `docs/greenfield-ui-ux-brief.md` still mentions pink — treat as historical product brief until CPO retires it.

---

## Visual-truth findings (by state)

### Happy path — menu (desktop + mobile)
- Clear hierarchy in ~2s: venue name (gold italic) > greeting > filters > mosaic (**Aesthetic-Usability**, **Serial Position**).
- Desktop `GuestShell` sidebar: Concierge / Menu / Table Service + **Call Sommelier** CTA.
- Mobile: brand wordmark + Call server; search + category + dietary chips.
- Mosaic: featured starter card can show **empty dark plane** when image fails/404 (**Pragnanz** break).
- Unavailable items use opacity only — no “Unavailable” label (**Recognition over Recall**).

### Loading
- Copy-only: “Getting your menu…” — no spinner, skeleton, or brand (**Doherty Threshold**, perceived performance).
- No path if fetch hangs beyond copy.

### Error (invalid QR)
- Centered `text-error` string only — **no brand, no recovery, no Call server** (**Nielsen: error recovery**, **Forgiveness**).
- Live DB without seed → guests hit this for the README demo code.

### Empty menu
- Icon + “Menu is empty” + kitchen updating copy — good baseline.
- Dietary chips still show with no categories when menu is empty (**Hick’s Law** / useless choice).
- Mobile hamburger still visible/non-functional.

### Item detail (`ItemDetailSheet` + `Sheet variant="dark"`)
- Strong: image, allergens, qty, gold **Add to cart** (**Fitts’s Law**).
- Special instructions free text — keep; do not add PII fields.

### Cart (`CartSheet`)
- Collapsed dock + expanded sheet work; confirm label switches for `pay_per_order` (**Progressive Disclosure**).
- Remove-only lines — no qty stepper in cart (**Forgiveness** / extra taps).
- Duplicate accessible name: `aria-label="View cart"` + visible “View cart” button (**a11y smell**).

### Payment (`PaymentSheet`)
- Tip default **20%** — persuasion via **Defaults**, not a dark pattern; **None** + custom available.
- Pay-before-kitchen copy explicit — keep.
- **Pay later** exits sheet with unpaid `pending_payment` order — correct for kitchen invariant; needs clearer status dock copy so guest doesn’t think order is cooking (**Zeigarnik**).
- Failure message styled as gold info banner, not `error` / `role="alert"` (**Selective Attention**).
- Duplicate titles: Sheet title “Payment” + inner H2.

### Requests (`RequestsSheet`)
- 2×2 Water / Bread / Napkins / Check — good **Hick’s** budget.
- Large targets for one-hand use (**Fitts**, restaurant context).

---

## WCAG / a11y

| Check | Result |
|-------|--------|
| Gold `#f2ca50` on `#131313` | ~11.8:1 — pass |
| Muted `#d0c5af` on bg | ~10.9:1 — pass |
| Error `#ffb4ab` on bg | ~10.9:1 — pass |
| Cart `animate-ping` | No `prefers-reduced-motion` kill on that node (**WCAG 2.3.3**) |
| Error / loading full-page | Missing landmark / heading structure |
| Mobile Menu button | No action — false affordance |

No dark patterns (roach motel, confirmshaming, sneak-into-basket, bait-and-switch). Tip default is transparent and reversible.

---

## Prioritized punch list (for Founding Engineer)

### P0 — ship blockers
1. **Scan error recovery UI** — branded `guest-dark` panel: headline, plain-language reason, primary **Ask a server**, secondary **Try again** (reload). Tokens: `luxury-*`, `gold`, `Button` secondary/primary. Components: new `GuestErrorState` or inline in `page.tsx`.
2. **Loading state** — brand mark + “Getting your menu…” + indeterminate progress (CSS) or 3-card skeleton using `luxury-surface-high`. Respect `prefers-reduced-motion`.
3. **Mobile hamburger** — either wire to a sheet (Concierge / Menu / Call server) **or remove** the control. Broken signifier is worse than none (**Norman’s affordances**).
4. **Rename “Call Sommelier” → “Call server”** in `GuestShell` desktop CTA (parity with mobile; most venues are not wine service).
5. **Payment failure styling** — use `border-error/40 bg-error/10 text-error` + `role="alert"`; keep gold for totals/success only.
6. **Pay later → status dock** — ensure `pending_payment` dock copy stays “Pay to send to kitchen” (already present); after dismiss, auto-show dock without requiring scroll.

### P1 — polish
7. Image fallback on mosaic cards (gradient + dish initial / category label) when `image_url` missing or broken.
8. Unavailable badge on sold-out items (`Badge` outline or `StatusPill`).
9. Cart qty ± steppers; keep remove.
10. Hide dietary chips when `categories.length === 0`.
11. Dedupe Payment sheet title; single H2.
12. Fix duplicate “View cart” accessible names.
13. Gate `animate-ping` behind motion preference.

### P2 — later
14. Venue `brand_color` overriding `--color-flow` can fight gold system — constrain to accent chips/CTAs, not global token rewrite mid-session.
15. Concierge tab content (desktop) is currently scroll-to-top only — either real concierge panel or drop the tab (**Occam**).

---

## Acceptance criteria (P0 child)

- [ ] Invalid QR at 390×844 shows branded recovery with Call server + Try again (screenshot).
- [ ] Loading at 390×844 shows progress/skeleton within 100ms of navigation.
- [ ] Mobile header has no dead Menu control (removed or functional sheet).
- [ ] Desktop CTA label is “Call server”.
- [ ] Declined card uses error token styling + alert role.
- [ ] No new guest PII fields; tip still optional with None.

---

## Residual risks

- Demo QR in README fails until seed/DB applied — ops, not UI.
- Stripe Elements path not visually verified in this run (payments_disabled mock used).
- Security owns payment auth path ([SecurityEngineer](/TAB/agents/securityengineer)); UX must not weaken pay-before-fire.

## Handoffs

- Implementation: Founding Engineer (P0 child).
- Browser verification after P0: QA at 390×844 + 1440×900 for states listed above.
- Product: CPO if Concierge IA or sommelier wording must stay venue-configurable.
