# TableFlow — Product Requirements Document
**Version:** 1.0  
**Status:** Active  
**Last Updated:** June 2026  
**Stack:** Next.js 14 · React Native (Expo) · Supabase · TypeScript · Stripe Connect

---

## 1. Executive Summary

TableFlow is a QR/NFC-based mobile ordering and operations platform for restaurants and bars. Customers scan a code at their table, browse a rich media menu, place and pay for orders directly from their phone, and track live order status without flagging down a server. Operators get a real-time backend — orders, kitchen display, inventory, analytics, and AI-driven insights — all in one system. TableFlow works as a standalone POS or as a layer on top of existing POS systems (Toast, Square, Clover).

**Target market:** Full-service restaurants, fast casual, and bars/nightlife — English-speaking markets globally from day one.

---

## 2. Problem Statement

Restaurants lose revenue and guests lose patience at the same two moments: waiting to order and waiting to pay. Servers are spread thin, menus are static, reorders get dropped, and operators fly blind on what's actually selling and what's sitting in the walk-in. Existing solutions either replace everything (disruptive, expensive) or bolt on a single feature (ordering without ops, or analytics without the ordering pipeline that feeds it). TableFlow collapses the entire guest and operator journey into one connected system.

---

## 3. Core Personas

### 3.1 Guest (Customer)
- Arrives at a table, scans the QR code or taps the NFC pad
- Wants to browse, order, and pay without waiting for a server
- May be dining alone, with a partner, or in a group that needs to split
- Expects the experience to feel as polished as a consumer app

### 3.2 Server / Floor Staff
- Manages multiple tables simultaneously
- Needs instant notification when a table requests something (water, bread, check)
- Uses a mobile app on their own device — no dedicated hardware required
- Needs to see table status at a glance without a fixed terminal

### 3.3 Kitchen Staff
- Works from a Kitchen Display Screen (KDS) — web-based, runs on any tablet or monitor
- Needs orders to appear instantly, in priority order, with timers
- Needs to mark items and tickets as in-progress and complete

### 3.4 Venue Operator / Manager
- Configures menus, tables, and hours from a web dashboard
- Monitors live floor activity, revenue, and inventory
- Reviews AI-generated insights on popular items, slow movers, and predicted demand
- Manages staff accounts and permissions

### 3.5 Platform Admin (TableFlow Internal)
- Onboards venues and manages Stripe Connect accounts
- Monitors platform health, transaction volume, and support tickets

---

## 4. Product Surface Areas

| Surface | Who Uses It | Tech |
|---|---|---|
| Guest mobile app | Customers | React Native (Expo) |
| Operator web dashboard | Managers | Next.js 14 |
| Server mobile app | Floor staff | React Native (Expo) |
| Kitchen Display Screen (KDS) | Kitchen staff | Next.js 14 (web, tablet-optimized) |
| TableFlow admin portal | Internal team | Next.js 14 |

---

## 5. Feature Scope

### 5.1 QR / NFC Table Entry
- **Static QR:** One permanent code per table. Printed on tent card, coaster, or table surface. Free to regenerate.
- **Dynamic QR:** New session code generated per visit. Expires when the tab is closed. Prevents session hijacking.
- **NFC:** NFC tag embedded in table. Guest taps phone, session opens instantly. QR fallback always present.
- Operator chooses mode per venue in dashboard settings.
- Scan/tap opens the guest app (or web fallback if app not installed) and binds the session to that table + venue.

### 5.2 Guest Menu Experience
- Full-bleed hero images per menu item
- Item name, description, allergen tags, price, modifier options (size, temp, add-ons)
- Category tabs (Appetizers, Mains, Drinks, Desserts — operator-configurable)
- Search within menu
- AI upsell suggestions inline ("Pairs well with…", "Most ordered with this…")
- "Your usual" AI reorder nudge for returning guests (based on past order history at that venue)
- Dietary filters: vegan, gluten-free, nut-free, etc. (operator-tagged per item)

### 5.3 Ordering Flow
- Guest adds items to cart, reviews, and submits order
- Order goes live to kitchen KDS and server app instantly via Supabase Realtime
- Guest sees live status: **Received → Preparing → Ready → Delivered**
- Mid-meal reorder: guest can add more items at any time; new items append to the open ticket
- Request flow: tap "Request" to ask for water, bread, extra napkins, etc. — server gets a push notification with table number and request type
- Last call / closing: operator can push a "last call" notification to all active tables

### 5.4 Payment
- **Preauth model (restaurant default):** Card saved on session open via Stripe Payment Intent (authorize only). Charged at table close. Guest can leave without waiting.
- **Pay-per-order (fast casual / bar default):** Guest pays immediately at checkout for each order round.
- **Bar tab model:** Card on file, running tab accumulates all orders. Guest or server closes tab at end of night.
- Tip selection: 15% / 20% / 25% / custom / no tip — presented at close
- **Split options:**
  - Each person pays their own items
  - Split evenly by number of people
  - One person pays all
  - Custom amounts
- Apple Pay and Google Pay supported via Stripe Payment Request Button
- Stripe Connect Express: funds go directly to venue's Stripe account; TableFlow takes `application_fee_amount` (0.4%, platform fee)

### 5.5 Server App
- Live table map showing: empty / active / needs attention / tab open
- Push notifications for: new order placed, item request, tab ready to close
- Ability to mark requests as fulfilled
- View full order detail per table
- Ability to manually add items to a table's order (for guests who prefer to order verbally)
- Fire/hold items: server can hold a course and fire when ready
- Close and process tab from server side if needed

### 5.6 Kitchen Display Screen (KDS)
- Web app, optimized for landscape tablet or monitor
- Tickets appear in real time, sorted by time received
- Color-coded urgency: green (new) → yellow (5+ min) → red (10+ min)
- Mark individual items complete or full ticket complete
- Course separation: Appetizers shown separately from Mains
- Bump bar support (keyboard shortcut to bump tickets)
- Audio alert on new ticket

### 5.7 Operator Dashboard
- **Menu management:** Add/edit/delete items, upload images, set prices, configure modifiers, tag allergens, toggle availability (86 an item instantly)
- **Table management:** Define table layout, assign QR/NFC codes, set table capacity
- **Staff management:** Add/remove staff, assign roles (server, kitchen, manager), generate server login codes
- **Hours and venue settings:** Operating hours, venue name, logo, brand colors for menu
- **POS integration:** Connect to Toast, Square, or Clover via OAuth. Standalone mode if no POS.
- **Live floor view:** Real-time table status, order counts, open tabs
- **Inventory tracking:** Set par levels per ingredient/item, deduct on order, alert when low, AI demand forecasting to predict what to prep
- **Analytics:** Revenue by hour/day/week, covers count, average check size, top items, slowest items, busiest tables, server performance
- **AI insights panel:** "Your ribeye is trending 40% above last Saturday — consider prepping extra" / "Truffle fries have been 86'd 3 Fridays in a row — adjust par"

### 5.8 AI Agent Layer
- **Upsell agent:** Analyzes current order + menu + time of day + popularity data → surfaces contextually relevant add-ons in guest app
- **Reorder agent:** Identifies returning guest (by phone/email), surfaces "your usual" at session open
- **Demand forecasting agent:** Analyzes historical order data, day of week, weather, local events → predicts item demand per shift, outputs prep recommendations
- **Inventory agent:** Monitors depletion in real time, flags low stock, auto-suggests 86ing items near depletion
- **Insights agent:** Generates plain-English operator summaries daily/weekly ("Last week your top revenue driver was the prix fixe at $3,200 total. Tuesday lunch was 22% below your 4-week average.")

### 5.9 Notifications
- Push notifications (Expo Push / APNs / FCM) for servers and kitchen
- SMS fallback for servers who prefer it (Twilio)
- In-app toast notifications for guests (order status updates)
- Email receipts to guests post-meal via Stripe + Resend

---

## 6. Monetization

### Platform Fee Structure

| Tier | Monthly Fee | Best For |
|---|---|---|
| Starter | $99/mo | Single location, up to 20 tables |
| Growth | $199/mo | Single location, unlimited tables |
| Multi-Venue | $399/mo | Up to 5 locations |
| Enterprise | Custom | Chains, franchises, 6+ locations |

- All tiers include a **0.4% platform fee** on gross payment volume processed through TableFlow (capped at $2.00 per transaction)
- Stripe's standard processing fee (2.9% + 30¢) is paid by the venue to Stripe directly
- TableFlow never holds customer funds — all flows through Stripe Connect Express

### Revenue Levers (Post-MVP)
- White-label licensing for hospitality groups
- Premium analytics add-on ($49/mo)
- SMS marketing module ($29/mo)
- Hardware (NFC tags, branded QR stands) — direct margin

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Order-to-KDS latency | < 500ms (Supabase Realtime) |
| App cold start | < 2 seconds |
| Payment processing | < 3 seconds end to end |
| Uptime SLA | 99.9% |
| Concurrent sessions per venue | 500+ |
| Image CDN delivery | < 200ms (Supabase Storage + CDN) |
| PCI compliance | Stripe handles all card data; TableFlow is SAQ-A |
| GDPR / CCPA | Guest data minimization; opt-in email receipt |

---

## 8. Out of Scope (MVP)

- Loyalty / points program
- Reservation system
- Online ordering / delivery (off-premise)
- Multi-language support
- Native Windows / desktop app
- Payroll integration
- Offline mode (requires internet connection)

---

## 9. Success Metrics

| Metric | 90-Day Target |
|---|---|
| Venues onboarded | 25 |
| Gross payment volume | $500K |
| Guest app sessions | 5,000 |
| Average order-to-KDS time | < 400ms |
| Operator churn | < 5% monthly |
| NPS (guest) | > 55 |
| NPS (operator) | > 60 |

---

## 10. Launch Timeline

| Phase | Duration | Milestone |
|---|---|---|
| Phase 1 — Foundation | Weeks 1–4 | Auth, Supabase schema, Stripe Connect onboarding, static QR scan, menu render |
| Phase 2 — Core Order Loop | Weeks 5–8 | Guest ordering, KDS, server app, Supabase Realtime, payment preauth + capture |
| Phase 3 — Ops Layer | Weeks 9–12 | Operator dashboard, inventory, analytics, menu management |
| Phase 4 — AI Layer | Weeks 13–16 | Upsell agent, demand forecasting, reorder nudge, insights panel |
| Phase 5 — Polish + Launch | Weeks 17–20 | POS integrations, NFC, split billing, performance hardening, beta venues |

**Target public launch:** Q4 2026
