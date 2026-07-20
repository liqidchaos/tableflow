# TableFlow

Modern hospitality infrastructure: guest ordering, kitchen display, operator dashboard, and server tools.

**Stack:** Next.js 14 · Expo SDK 54 (React Native) · Supabase · TypeScript · Stripe Connect

---

## Prerequisites

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local DB)
- [Expo Go](https://expo.dev/go) app on your phone (SDK 54 — install from the App Store / Play Store; no custom dev build required)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> tableflow
cd tableflow
npm ci
```

### 2. Environment variables

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

Also copy env for the mobile app (symlink recommended so keys stay in sync):

```bash
ln -sf ../../.env.local apps/mobile/.env.local
# or: cp .env.example apps/mobile/.env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → API → service_role (server only) |
| `SESSION_JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000/api` (use your LAN IP on physical device) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same value as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional) |
| `STRIPE_*` | Optional — app degrades gracefully without Stripe |

**Project ref:** `cptyjloveecusgvituzo`  
**Dashboard:** https://supabase.com/dashboard/project/cptyjloveecusgvituzo

### 3. Link Supabase (remote)

```bash
npx supabase link --project-ref cptyjloveecusgvituzo
npx supabase db push        # apply migrations
```

Or run locally:

```bash
npx supabase start
npx supabase db reset       # migrations + seed
```

### 4. Sync platform config (AI edge functions)

```bash
npm run sync:platform-config
```

### 5. Run development servers

```bash
# All apps (web + mobile)
npm run dev

# Web only
cd apps/web && npm run dev

# Mobile only (Expo SDK 54 — compatible with standard Expo Go)
cd apps/mobile && npx expo start --clear
```

Web: http://localhost:3000  
KDS: http://localhost:3000/kds  
Guest web (QR): http://localhost:3000/g/tf_t_88888888_a1b2c3d4

---

## Smoke Test (End-to-End)

### Operator setup

1. Open http://localhost:3000/register — create operator account (auto-creates venue + 4 tables + demo menu)
2. Sign in at /login — dashboard shows the **Get live in under 2 hours** checklist
3. Go to **Tables** — use **Print all QRs**, or open a guest link per table
4. Confirm billing / Stripe on **Settings**, then place a paid test order from a phone

Full timed checklist: [`docs/operator-setup-checklist.md`](docs/operator-setup-checklist.md)

### Guest order (web — no app install)

1. Open `/g/<qr_code>` (e.g. `/g/tf_t_88888888_a1b2c3d4` if seeded)
2. Browse menu, add items, confirm order
3. Order status bar shows Received → Preparing → Ready

### Guest order (mobile — Expo Go)

The mobile app targets **Expo SDK 54** so it runs in the standard Expo Go app from the App Store / Play Store (no development build required).

1. Stop any running Metro/Expo process, then: `cd apps/mobile && npx expo start --clear`
2. Scan the QR code with the **Expo Go** app (Camera on iOS, Expo Go on Android)
3. On a physical device, set `EXPO_PUBLIC_API_URL` in `.env.local` to your machine's LAN IP (e.g. `http://192.168.1.10:3000/api`)
4. Enter a table QR code on the scan screen (or scan with camera)
5. Add items → cart → confirm order
6. Watch live status on Order Status screen

### Kitchen (KDS)

1. Sign in as operator, open http://localhost:3000/kds
2. Place a guest order — ticket appears with audio alert
3. Start → Ready → Bump through statuses

### Server mode (mobile)

1. Operator adds staff at **Staff** in dashboard (email + password)
2. Mobile → Server Mode → sign in with staff credentials
3. Floor view shows table status; push notifications fire on new orders/requests

### Requests

1. Guest: tap "Request water / napkins" on menu screen
2. Server: sees alert on floor view + push notification

---

## Testing

```bash
# Type check (all packages)
npm run type-check

# Unit tests
npm run test

# E2E (Playwright — mocks API, no live Supabase required)
cd apps/web && npx playwright test

# Lint
npm run lint
```

CI/CD (GitHub Actions + Vercel): see [`docs/ci-cd.md`](docs/ci-cd.md).

---

## Stripe (optional)

Payments are **disabled gracefully** when Stripe keys are unset:

- Guest payment screen shows "pay at counter" message
- `POST /api/payments/*` returns `payments_disabled: true`
- Operator can still use full ordering, KDS, and dashboard

To enable payments:

1. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env.local`
2. Complete Stripe Connect onboarding at **Settings** in dashboard
3. Configure webhook endpoint: `https://your-domain/api/webhooks/stripe`
   - Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, `charge.refunded`

---

## Project Structure

```
tableflow/
├── apps/
│   ├── web/          # Next.js — dashboard, KDS, guest web, API routes
│   └── mobile/       # Expo SDK 54 — guest + server apps (Expo Go)
├── packages/
│   ├── db/           # Supabase clients, JWT, QR, realtime helpers
│   ├── types/        # Shared types + Zod schemas
│   └── ui/           # Shared web components
├── supabase/
│   ├── migrations/   # SQL migrations (001–014)
│   ├── functions/    # Edge functions (AI agents)
│   └── seed.sql      # Demo venue seed
└── context/          # Product specs (do not edit plan files)
```

---

## CI

GitHub Actions runs on push/PR to `main`:

- `npm run type-check`
- `npm run test`
- `npm run lint`
- Playwright E2E (mocked, no Supabase required)

---

## Blocked on Stripe keys only

These features require Stripe configuration:

- Card preauth / pay-per-order / bar tab charging
- Stripe Connect venue onboarding payouts
- Payment webhooks updating captured status
- Apple Pay / Google Pay (via Stripe Payment Sheet)

Everything else — ordering, KDS, floor view, requests, push notifications, AI insights (with Anthropic key), analytics — works without Stripe.

---

## Mobile production builds (EAS)

The app runs in **Expo Go** (SDK 54) for development. For App Store / Play Store builds, use EAS:

```bash
cd apps/mobile
npx eas-cli login
npx eas build --profile preview    # internal test build
npx eas build --profile production # store release
```

Scaffold config lives in `apps/mobile/eas.json`. Set `EXPO_PUBLIC_PROJECT_ID` in `.env.local` for push notifications in production builds.

