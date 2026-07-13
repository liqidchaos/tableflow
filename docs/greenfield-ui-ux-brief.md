# TableFlow: Platform Overview for Greenfield UI/UX

Design agent brief for a greenfield UI/UX redesign of the TableFlow hospitality operations platform.

---

## What it is

TableFlow is a hospitality operations platform for restaurants and bars. It replaces fragmented guest ordering, kitchen coordination, and payment flows with one connected system that does not require POS integration or guest app downloads.

The core promise: **from scan to paid, in one tap.**

Guests scan a QR code at their table, order from their phone, pay, and the kitchen only sees paid tickets. Staff get a live view of the floor. Operators run the business without wiring into legacy POS systems.

---

## Who it is for

**Primary buyer:** Restaurant and bar operators (owners, GMs, ops-minded managers) who want faster service, less POS friction, and better floor/kitchen sync.

**Secondary users:**

- **Guests** at the table (web, no app install)
- **Kitchen staff** (kitchen display on pass screens)
- **Servers / floor staff** (mobile app for table status and guest requests)
- **Operators / managers** (dashboard for setup, analytics, settings)

---

## The three product surfaces

1. **Marketing site**  
   Public site that sells the platform: hero, how it works, product proof (guest phone, kitchen display, floor view), metrics, pricing, signup.

2. **Guest web** (`/g/[code]`)  
   Mobile-first web experience after scanning a table QR. Menu browsing, ordering food/drinks/cutlery/extras, payment, order status, calling server, reordering.

3. **Operator apps**  
   - **Dashboard** (web): venue setup, tables, menu, settings, billing, help  
   - **Kitchen Display (KDS)** (web): real-time ticket wall for the line  
   - **Mobile app** (native): floor view, table status, guest routing  

Greenfield focus is likely the **marketing site** and **guest web** first; dashboard/KDS/mobile can follow the same design system.

---

## Core product flow (5 steps, payment before kitchen)

**Guest journey (correct order matters):**

1. **Scan:** QR at table, no app download  
2. **Order:** Food, drinks, cutlery, extras; guests can add more items anytime  
3. **Pay:** Payment clears **before** the kitchen sees the ticket  
4. **Kitchen fires:** Paid orders hit the line in real time with course timing and age tracking  
5. **Anytime:** Call server, request napkins/water, place another round from the same screen  

Payment-before-kitchen is a key differentiator. Do not design flows that imply the kitchen fires before payment.

---

## Product pillars

| Pillar | What users get |
|--------|----------------|
| **Guest ordering** | QR web ordering, no downloads, add items anytime |
| **Kitchen display** | Digital ticket wall, course timing, age indicators, paid-only firing |
| **Operator floor** | Live table status: who is ordering, eating, paying, empty |
| **Payments** | Stripe-powered; platform fee 0.4% GMV, capped at $2 per charge |

---

## Key differentiators

Messaging and UX should reinforce:

- No POS integration required  
- No guest app downloads  
- Pay before kitchen fires  
- Guests can keep ordering and call the server without leaving the table  
- Setup in under 2 hours (marketing claim)  
- Simple pricing, no surprises  

---

## Pricing

- **Starter:** $99/mo, up to 20 tables  
- **Growth:** $199/mo, unlimited tables (positioned as most popular)  
- **Platform fee:** 0.4% on guest payments, capped at $2 per charge  
- **Trial:** 30-day free trial, no credit card, no POS required  

---

## Brand and visual direction

Recent direction (Tesla/Apple inspired):

- Near-monochrome: black, white, gray  
- **Flow pink** (`#FF4D6D`) as the only accent (CTAs, highlights)  
- Full-bleed photography for hero, kitchen display, floor view  
- Generous whitespace, large type, subtle scroll motion  
- Typography: Space Grotesk (display), Inter (body), JetBrains Mono (labels/stats)  

**Copy rule:** No em dashes in user-facing copy.

Greenfield can evolve this, but the product should still feel premium, operational, and trustworthy (not playful consumer app).

---

## Existing marketing sections (information architecture)

1. **Hero:** Scan to paid promise + trial CTAs  
2. **How it works:** 5 steps (scan → order → pay → kitchen → anytime)  
3. **Kitchen display:** Ticket wall, paid-first, real time  
4. **Operator floor:** Table grid with status (ordering, eating, paying, open)  
5. **Metrics:** Setup time, zero app downloads, fee structure  
6. **Pricing teaser:** Starter vs Growth + full pricing link  
7. **Final CTA:** Trial signup  

---

## Guest web UX priorities

- Persistent order status (guest always knows where their order stands)  
- Empty states when nothing is ordered yet  
- Sheets/modals for payment, server requests, extras  
- Mobile-first; thumb-friendly; works on restaurant Wi-Fi  
- Clear separation: browse → cart → pay → confirmation  

---

## Kitchen display UX priorities

- Dark UI for kitchen environment  
- Tickets grouped by table/bar, course, status (firing, ready, hold, queued)  
- Age indicators so nothing sits too long  
- High contrast, glanceable at a distance  
- Real-time updates from guest orders  

---

## Floor / operator UX priorities

- Table grid: T4, T7, T12, etc. with status pills (ordering, eating, paying, open)  
- Guest count and running total per table  
- Guest requests routed to the right server  
- Add items without re-scanning  

---

## Out of scope

Unless explicitly requested:

- Full dashboard redesign  
- KDS app UI overhaul (functional, dark, out of prior marketing scope)  
- Deep POS integration flows  
- Email template redesign  

---

## Technical constraints

- **Web:** Next.js 14, React, Tailwind, CSS custom properties, Framer Motion  
- **Design tokens** live in `globals.css` and `tailwind.config.ts`  
- **Shared UI package** (`@tableflow/ui`) used across marketing, guest, dashboard  
- **Assets:** Hero phone-on-table, kitchen display mockup, floor tablet mockup, step icons (scan, order, pay, kitchen, request)  

---

## Suggested deliverables

1. Design system (color, type, spacing, components)  
2. Marketing homepage (desktop + mobile)  
3. Guest ordering flow (scan → menu → cart → pay → status → reorder/request)  
4. Component library aligned with `@tableflow/ui` primitives where possible  
5. Motion spec (scroll reveals, parallax, reduced-motion fallbacks)  

---

## One-line brief

> Design a premium, Tesla/Apple-inspired hospitality ops brand for TableFlow: monochrome + one pink accent, image-led marketing, and a frictionless guest web flow where payment happens before the kitchen fires and guests can order, pay, and request help from one phone screen. No app, no POS.
