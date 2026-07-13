# Guest web walkthrough — `/g/[code]` (TAB-6)

**Date:** 2026-07-13  
**Invariant:** Kitchen only sees paid tickets; guest path stays web-only.

## Happy path (pay_per_order)

1. Guest scans QR → `POST /api/sessions/scan` → menu loads.
2. Tap item → Add to cart → **View cart** expands the sheet (does not place the order).
3. **Continue to pay · $X** creates the order as `pending_payment` and opens payment.
4. Select tip → **Continue to pay** creates the PaymentIntent with that tip locked.
5. Stripe confirm → success sheet: *Payment cleared. Sending your order to the kitchen…*
6. Status bar / order sheet show **Awaiting payment** until fire; after pay, kitchen enqueue is server-side (TAB-5).

## Friction fixed in this pass

| Before | After |
|---|---|
| Collapsed cart CTA said "View cart" but placed the order | Both CTAs open the cart; confirm only inside the sheet |
| Tip editable after PI created (amount mismatch) | Tip first, then lock + create intent |
| Pay sheet closed silently on success | Explicit paid confirmation; kitchen copy |
| Order sheet always showed "Pay & close tab" | `pay_per_order` + `pending_payment` → **Pay now** |
| Status chip after unpaid order said generic "Details" | **Pay to send to kitchen** / **Pay now** |
| E2E assumed preauth + immediate `received` | Mocked pay_per_order → pending_payment → pay gate |

## Verify

```bash
cd apps/web
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npx playwright test e2e/order-flow.spec.ts -g "guest web"
```

Evidence: `guest web scan → menu → cart → pay gate` **passed** (2026-07-13).

## Out of scope (follow-ups)

- Live Stripe Elements confirm in e2e (needs test keys / Stripe mock).
- Native guest app (explicitly out of TAB-6).
- KDS paid-only UI polish → [TAB-7](/TAB/issues/TAB-7) — see `docs/kds-paid-only-audit.md`.
