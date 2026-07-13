# TableFlow — System Architecture
**Version:** 1.0

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GUEST LAYER                              │
│                                                                 │
│   ┌─────────────┐      QR Scan / NFC Tap                       │
│   │  Guest App  │ ─────────────────────────────────────────┐   │
│   │ (React Nat) │                                           │   │
│   └─────────────┘                                           │   │
└────────────────────────────────────────────────────────────────-┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       STAFF LAYER                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Server App  │  │     KDS      │  │  Operator Dashboard │   │
│  │ (React Nat)  │  │  (Next.js)   │  │     (Next.js)      │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                │
│                                                                 │
│              Next.js API Routes / Edge Functions                │
│                   (deployed on Vercel)                          │
│                                                                 │
│   Auth │ Orders │ Payments │ Menu │ Inventory │ Analytics      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
┌──────────────┐  ┌─────────────────┐  ┌───────────────┐
│  Supabase    │  │  Stripe Connect │  │  AI Services  │
│              │  │                 │  │               │
│ - PostgreSQL │  │ - Payment Intent│  │ - Claude API  │
│ - Auth       │  │ - SetupIntent   │  │   (insights,  │
│ - Realtime   │  │ - Connect Expr  │  │   upsells,    │
│ - Storage    │  │ - Webhooks      │  │   forecasting)│
│ - Edge Fn    │  │                 │  │               │
└──────────────┘  └─────────────────┘  └───────────────┘
           │
           ▼
┌──────────────────────────────┐
│     External Integrations    │
│                              │
│  - Toast POS (REST API)      │
│  - Square (SDK)              │
│  - Clover (REST API)         │
│  - Twilio (SMS fallback)     │
│  - Resend (email receipts)   │
│  - Expo Push (notifications) │
└──────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Surface | Framework | Notes |
|---|---|---|
| Guest App | React Native (Expo SDK 51) | iOS + Android. Web fallback via Expo Web for guests without app. |
| Server App | React Native (Expo SDK 51) | Same codebase as guest app, staff-gated routes |
| Operator Dashboard | Next.js 14 (App Router) | Web only. SSR for analytics, client for realtime. |
| KDS | Next.js 14 | Tablet-optimized, landscape, Supabase Realtime subscription |
| Admin Portal | Next.js 14 | Internal TableFlow team use |

### Backend

| Component | Technology | Notes |
|---|---|---|
| API | Next.js API Routes + Supabase Edge Functions | Business logic in Edge Functions where Supabase context needed |
| Database | Supabase PostgreSQL | Primary data store |
| Realtime | Supabase Realtime (WebSocket) | Orders, KDS, requests — < 500ms delivery |
| Auth | Supabase Auth | JWT-based. Guest sessions use custom short-lived tokens. |
| File Storage | Supabase Storage | Menu images, venue assets. CDN-backed. |
| Job Queue | Supabase pg_cron + Edge Functions | AI insight generation, inventory alerts, daily summaries |
| Payments | Stripe Connect Express | No card data ever touches TableFlow servers |

### Infrastructure

| Component | Provider | Notes |
|---|---|---|
| Hosting | Vercel | Next.js apps. Edge network for global latency. |
| Mobile Distribution | Expo EAS | OTA updates, TestFlight + Play Store builds |
| CDN | Supabase Storage CDN | Menu images served < 200ms globally |
| Monitoring | Vercel Analytics + Sentry | Error tracking, performance monitoring |
| Logging | Supabase Logs + Axiom | Structured logs, audit trail |
| Secrets | Vercel Environment Variables | Never committed to git |

---

## Data Flow: Guest Places an Order

```
1. Guest scans QR code
   └─► POST /sessions/scan
       └─► Supabase: create/resume table_session
       └─► Return: session_token (scoped JWT)

2. Guest browses menu
   └─► GET /venues/:id/menu (public, cached)
       └─► Supabase: select menu_items + categories

3. Guest adds items and submits
   └─► POST /orders (auth: session_token)
       └─► Validate items are available
       └─► Deduct inventory via menu_item_inventory
       └─► Insert order + order_items to Supabase
       └─► Supabase Realtime broadcasts to:
           ├─► KDS (venue channel) — ticket appears instantly
           └─► Server App (venue channel) — table status updates

4. Guest pays (preauth mode)
   └─► POST /payments/setup-intent
       └─► Stripe: CreateSetupIntent for venue's Connect account
   └─► Guest completes card entry in app (Stripe SDK, no card data to server)
   └─► POST /payments/authorize
       └─► Stripe: CreatePaymentIntent (capture_method: manual)
       └─► Store pi_id in table_session

5. Kitchen prepares, marks ready
   └─► PATCH /orders/:id/status { status: "ready" }
       └─► Supabase Realtime → Guest App: status toast notification
       └─► Expo Push: server app notification

6. Meal complete, guest closes tab
   └─► POST /payments/capture
       └─► Stripe: CapturePaymentIntent with final amount + tip
       └─► application_fee_amount = 0.4% to TableFlow Stripe account
       └─► Remainder flows to venue's Stripe Connect account
       └─► Resend: email receipt to guest
       └─► Close table_session
```

---

## Data Flow: Realtime Order to KDS

```
Guest App                  Supabase                    KDS
    │                          │                         │
    │  POST /orders             │                         │
    ├─────────────────────────► │                         │
    │                          │  INSERT orders           │
    │                          │  INSERT order_items      │
    │                          │                         │
    │                          │  Realtime broadcast      │
    │                          ├────────────────────────► │
    │                          │  orders:venue_id=eq.xxx  │
    │                          │                         │
    │                          │                    Ticket appears
    │                          │                    on KDS < 500ms
```

---

## Stripe Connect Architecture

```
TableFlow Platform Account
    │
    ├── venue_A → acct_1A (Stripe Express Account)
    │       └── Customer payment $80
    │               ├── $79.68 → venue_A Stripe payout
    │               └── $0.32  → TableFlow (application_fee)
    │
    ├── venue_B → acct_1B (Stripe Express Account)
    │
    └── venue_C → acct_1C (Stripe Express Account)

Stripe handles:
  - KYC / identity verification for each venue
  - Bank account setup and payouts
  - Tax reporting (1099-K)
  - Fraud and chargeback management
  - PCI compliance (TableFlow is SAQ-A)
```

---

## AI Agent Architecture

```
┌───────────────────────────────────────────────────────┐
│                   AI Orchestrator                      │
│              (Supabase Edge Function)                  │
│              Triggered by: pg_cron + webhooks          │
└───────────────────┬───────────────────────────────────┘
                    │
      ┌─────────────┼─────────────────────┐
      ▼             ▼                     ▼
┌──────────┐  ┌──────────────┐   ┌────────────────┐
│  Upsell  │  │   Demand     │   │   Inventory    │
│  Agent   │  │  Forecasting │   │    Agent       │
│          │  │   Agent      │   │                │
│ Trigger: │  │ Trigger:     │   │ Trigger:       │
│ On order │  │ Daily 6am    │   │ On order       │
│ placed   │  │              │   │ (deduction)    │
│          │  │ Data:        │   │                │
│ Data:    │  │ - 90d orders │   │ Data:          │
│ - Cart   │  │ - Day of week│   │ - Current qty  │
│ - Menu   │  │ - Weather API│   │ - Par levels   │
│ - Pop.   │  │ - Local evts │   │ - Depletion    │
│   data   │  │              │   │   rate         │
│          │  │ Output:      │   │                │
│ Output:  │  │ Prep recs in │   │ Output:        │
│ Inline   │  │ ai_insights  │   │ Alert +        │
│ suggs in │  │              │   │ auto-86 opt    │
│ guest app│  │              │   │                │
└──────────┘  └──────────────┘   └────────────────┘
      ▼             ▼                     ▼
┌──────────────────────────────────────────────────┐
│              Claude API (claude-sonnet-4-6)       │
│   Structured prompts → JSON output               │
│   Written to ai_insights table                   │
└──────────────────────────────────────────────────┘
```

---

## POS Integration Architecture

```
TableFlow in POS Integration Mode:
                                        
  Guest App ─► TableFlow API ─► POS Adapter Layer
                                      │
                              ┌───────┴────────┐
                              ▼                ▼
                         Toast API        Square API
                         (REST)           (SDK)
                              │
                         Clover API
                         (REST)
                              
The POS Adapter:
- Translates TableFlow order schema to POS-native format
- Sends orders to POS kitchen printers / KDS (if venue uses POS KDS)
- Syncs menu items and prices bidirectionally
- Falls back to TableFlow standalone if POS API is unavailable
- Runs as a Supabase Edge Function per venue
```

---

## Security Architecture

| Layer | Implementation |
|---|---|
| Authentication | Supabase Auth JWT. Short-lived session tokens for guests (1hr TTL). |
| Authorization | Row Level Security on all Supabase tables. Role-based API middleware. |
| Payment data | Never stored on TableFlow servers. Stripe handles all PCI scope. |
| QR session binding | Session token is cryptographically tied to `table_id` + `venue_id`. Cannot be reused across tables. |
| Dynamic QR | Session token embedded in QR payload. Expires at tab close. Old codes rejected. |
| Operator secrets | POS access tokens stored encrypted in `venues` table (pgcrypto). |
| Rate limiting | Vercel Edge middleware: 60 req/min per IP on guest endpoints. |
| Webhook verification | Stripe webhook signature verified with `STRIPE_WEBHOOK_SECRET` on every event. |

---

## Notification Architecture

```
Order/Request Events
        │
        ▼
  Supabase Realtime
        │
   ┌────┴────┐
   ▼         ▼
In-App    Push Notification
(KDS,     (Expo Push API)
 Server       │
 App)     ┌───┴───┐
          ▼       ▼
        APNs    FCM
       (iOS)  (Android)
                │
          SMS Fallback
          (Twilio) — opt-in
```

---

## Deployment Architecture

```
Code Repository (GitHub)
        │
        ▼
  Vercel CI/CD Pipeline
        │
   ┌────┴──────────────────┐
   ▼                       ▼
Next.js Apps           Supabase Migrations
(Operator Dashboard,   (via supabase CLI in CI)
 KDS, Admin Portal)
        │
   Vercel Edge Network
   (Global CDN, 40+ regions)
        │
   ┌────┴────┐
   ▼         ▼
Preview     Production
Deploys     (tableflow.com)
(per PR)

Mobile (Expo EAS):
  ├── OTA Updates (JS changes, instant)
  └── Native Builds (via EAS Build → App Store / Play Store)
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_FEE_PCT=0.004

# AI
ANTHROPIC_API_KEY=

# Notifications
EXPO_ACCESS_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email
RESEND_API_KEY=

# POS Integrations
TOAST_CLIENT_ID=
TOAST_CLIENT_SECRET=
SQUARE_APPLICATION_ID=
CLOVER_APP_ID=

# App
NEXT_PUBLIC_APP_URL=https://tableflow.com
SESSION_JWT_SECRET=
SESSION_JWT_EXPIRY=3600
```
