# TableFlow — Go-to-Market Strategy
**Version:** 1.0  
**Target Launch:** Q4 2026

---

## Positioning

**For:** Restaurant and bar operators who are losing revenue and guests to slow service and manual workflows.  
**TableFlow is:** A QR-powered ordering and operations platform that connects guests, servers, and kitchen staff in real time — replacing friction with flow.  
**Unlike:** Clunky POS add-ons or basic QR menu apps, TableFlow is a full-stack operations platform with AI-driven insights, live inventory, and revenue analytics built in.

**One-liner:** "From scan to paid, in one tap."

---

## Target Customer Profile

### Ideal Venue (ICP)
- Independent restaurant or bar (1–5 locations)
- 10–60 tables
- $500K–$5M annual revenue
- Currently using paper menus, basic POS, or no digital ordering
- Owner-operated or small management team

### Early Adopter Profile
- Tech-comfortable operator aged 30–50
- Has tried Square or Toast and finds them expensive/rigid
- Cares about guest experience differentiation
- Pain point: losing Friday night revenue because staff can't keep up

### Geographic Priority (Launch)
- Phase 1: Atlanta, Austin, Nashville (high independent restaurant density, lower tech saturation than NYC/LA)
- Phase 2: NYC, LA, Chicago, Miami, London, Toronto

---

## Pricing (Recap)

| Tier | Price | Target |
|---|---|---|
| Starter | $99/mo | Single location, ≤20 tables |
| Growth | $199/mo | Single location, unlimited tables |
| Multi-Venue | $399/mo | Up to 5 locations |
| Enterprise | Custom | Chains / franchises |

Plus 0.4% platform fee on GMV (capped at $2.00/transaction).

**Free trial:** 30 days, no credit card required. Full feature access.

---

## Launch Channels

### 1. Direct Outreach (Month 1–2)
- Cold outreach to 200 independent restaurants in Atlanta, Austin, Nashville
- Offer free hardware (NFC table stand + printed QR cards) for first 25 venues
- Target: Owner/manager, not GM — decision maker who feels the pain
- Offer: "We'll set up your entire menu in 24 hours, free, and you pay nothing for 30 days"

### 2. Restaurant Industry Events
- National Restaurant Association Show (Chicago, May)
- Bar & Restaurant Expo (Las Vegas, March)
- Local hospitality meetups via Eventbrite

### 3. Referral Program
- Operators earn 1 month free for each referred venue that activates
- Servers earn a $50 gift card when their venue signs up (server-to-management referral)

### 4. Content Marketing
- YouTube: "Inside a TableFlow venue" operator case studies
- LinkedIn: Weekly operator insights ("What your Saturday night data is telling you")
- SEO: Long-tail content — "QR ordering for restaurants", "how to reduce wait times bar"

### 5. Integration Partners
- Toast / Square marketplace listings (post-MVP once integrations are live)
- Stripe Partner Program — listed as a Stripe verified partner

---

## Onboarding Flow

Day 0: Signup → Stripe Connect Express onboarding → Menu setup wizard  
Day 1: Automated email: "Your menu is live — here's how to print your QR codes"  
Day 3: In-app prompt: "Add inventory levels to unlock demand forecasting"  
Day 7: AI insight email: "Your first week on TableFlow: here's what the data says"  
Day 14: Check-in call from TableFlow team (for Starter+ tiers)  
Day 30: Trial ends → prompt to subscribe, show ROI summary ("You processed $X, served Y guests")

---

## Sales Motion

MVP sales motion is **founder-led**, no sales team required:

1. Identify venue via Instagram / Google Maps / Yelp (look for independent, 3–4 star, busy but reviews mention slow service)
2. Send personalized DM or email: "We built something for venues exactly like yours"
3. Demo via Loom or live screen share (15 min)
4. Free 30-day trial with white-glove setup
5. Convert to paid on month 2

First hire after product-market fit signal: one account executive focused on inbound.

---

## Competitive Landscape

| Competitor | Strength | Weakness vs TableFlow |
|---|---|---|
| Toast | POS ubiquity, hardware ecosystem | Expensive ($110+/mo + hardware), inflexible, not guest-facing mobile-first |
| Square for Restaurants | Affordable, brand recognition | Basic analytics, no AI, QR is bolt-on not native |
| Olo | Enterprise ordering platform | Designed for chains, not SMB; no table-side |
| Bopple / Mr Yum | QR menu ordering | Minimal ops layer, no KDS, no AI, no inventory |
| Presto / Ziosk | Tableside tablets | Hardware-dependent, ugly UX, per-table hardware cost |

**TableFlow's wedge:** The only platform that combines guest-facing mobile ordering + AI-powered kitchen ops + real-time inventory in one system with no hardware requirements.

---

## 90-Day KPIs

| KPI | Target |
|---|---|
| Beta venues signed | 25 |
| Gross Payment Volume | $500K |
| Monthly Recurring Revenue | $3,500 |
| Average time to first order (post-signup) | < 2 hours |
| Operator NPS | > 60 |
| Guest app rating | > 4.5 stars |
| Monthly churn | < 5% |

---

## Year 1 Revenue Model (Projection)

| Month | Venues | MRR | GMV | Platform Fees | Total Revenue |
|---|---|---|---|---|---|
| 1–2 | 10 | $990 | $80K | $320 | $1,310 |
| 3–4 | 25 | $2,475 | $200K | $800 | $3,275 |
| 5–6 | 50 | $4,950 | $400K | $1,600 | $6,550 |
| 7–9 | 100 | $9,900 | $800K | $3,200 | $13,100 |
| 10–12 | 200 | $19,800 | $1.6M | $6,400 | $26,200 |

**Year 1 ARR target:** ~$314K  
**Year 1 GMV target:** ~$18M  
**Year 1 platform fee revenue:** ~$72K

---

## Launch Checklist

- [ ] Stripe Connect platform account configured and verified
- [ ] Production Supabase project live with all migrations applied
- [ ] Guest app submitted to App Store and Play Store
- [ ] Operator dashboard live at app.tableflow.com
- [ ] Marketing site live at tableflow.com
- [ ] 5 beta venues fully onboarded and processing real orders
- [ ] Stripe webhook endpoint verified in production
- [ ] Push notifications tested on iOS and Android
- [ ] Sentry error monitoring active
- [ ] Support email and chat (Intercom or Crisp) live
- [ ] Privacy policy and terms of service published
- [ ] SOC 2 Type I audit initiated (can be post-launch, pre-enterprise)
