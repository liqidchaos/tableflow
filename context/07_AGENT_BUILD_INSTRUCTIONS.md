# TableFlow — AI Agent Build Instructions
**For:** Cursor / Claude Code / Windsurf  
**Version:** 1.0  
**Stack:** Next.js 14 · React Native (Expo) · Supabase · TypeScript · Stripe Connect

---

## How to Use This Document

This file is the master instruction set for an AI coding agent building TableFlow from scratch. Read it completely before writing a single line of code. Every section is sequential — do not skip phases.

---

## Repo Structure

```
tableflow/
├── apps/
│   ├── web/                    # Next.js 14 — Operator Dashboard + KDS + Admin
│   └── mobile/                 # Expo SDK 51 — Guest App + Server App
├── packages/
│   ├── db/                     # Supabase schema, migrations, seeds
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # Shared component library (web)
│   └── config/                 # Shared ESLint, TypeScript, Tailwind config
├── supabase/
│   ├── migrations/             # SQL migration files
│   ├── functions/              # Edge Functions (AI agents, webhooks)
│   └── seed.sql                # Dev seed data
├── docs/                       # All spec documents live here
└── .env.example                # Required environment variables
```

Use **Turborepo** for the monorepo build system.

---

## Phase 1: Foundation (Weeks 1–4)

### Step 1.1 — Initialize Monorepo

```bash
npx create-turbo@latest tableflow
cd tableflow
```

Configure `turbo.json`:
```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "type-check": {}
  }
}
```

### Step 1.2 — Supabase Project Setup

```bash
npx supabase init
npx supabase start
```

Apply migrations in order from `packages/db/migrations/`:
1. `001_venues.sql`
2. `002_tables_sessions.sql`
3. `003_menu.sql`
4. `004_orders.sql`
5. `005_payments.sql`
6. `006_staff.sql`
7. `007_inventory.sql`
8. `008_ai_insights.sql`
9. `009_audit_log.sql`
10. `010_rls_policies.sql`
11. `011_realtime.sql`
12. `012_indexes.sql`

Each migration file must be idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

### Step 1.3 — Shared Types Package

Create `packages/types/src/index.ts` with TypeScript interfaces matching every database table. Use the database schema document as the source of truth. Export all types as named exports.

Required types:
```typescript
export type Venue
export type VenueTable
export type TableSession
export type SessionGuest
export type MenuCategory
export type MenuItem
export type MenuItemModifier
export type MenuModifierOption
export type Order
export type OrderItem
export type ItemRequest
export type Payment
export type Staff
export type InventoryItem
export type AIInsight
```

### Step 1.4 — Next.js Web App

```bash
cd apps/web
npx create-next-app@14 . --typescript --tailwind --app --src-dir
```

Install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr @stripe/stripe-js stripe
npm install lucide-react framer-motion recharts
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
npm install zod react-hook-form @hookform/resolvers
```

Configure Tailwind with design system tokens from `06_DESIGN_SYSTEM.md`. Add custom CSS variables to `globals.css`.

### Step 1.5 — Expo Mobile App

```bash
cd apps/mobile
npx create-expo-app . --template blank-typescript
```

Install dependencies:
```bash
npx expo install expo-camera expo-barcode-scanner expo-notifications
npx expo install @stripe/stripe-react-native
npm install @supabase/supabase-js @react-navigation/native
npx expo install react-native-safe-area-context react-native-screens
```

### Step 1.6 — Stripe Connect Setup

In Stripe Dashboard:
1. Enable Connect → Express accounts
2. Set platform profile (Software → Restaurant Technology)
3. Configure OAuth redirect URL: `https://tableflow.com/api/stripe/callback`
4. Save `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

Implement Stripe onboarding flow:
```typescript
// apps/web/src/app/api/auth/stripe-onboard/route.ts
import Stripe from 'stripe';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const { venueId } = await req.json();
  
  // Get or create Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  
  // Save account ID to venue
  await supabase.from('venues').update({
    stripe_account_id: account.id
  }).eq('id', venueId);
  
  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/stripe/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/stripe/complete`,
    type: 'account_onboarding',
  });
  
  return Response.json({ onboarding_url: accountLink.url });
}
```

### Step 1.7 — QR Code System

Static QR implementation:
```typescript
// packages/db/src/qr.ts
import { createHash } from 'crypto';

export function generateStaticQRPayload(tableId: string, venueId: string): string {
  const payload = `tf_t_${tableId}_${venueId.slice(0, 8)}`;
  return payload;
}

export function generateQRImageURL(payload: string): string {
  // Use qrcode npm package server-side
  return `https://api.tableflow.com/v1/qr/${encodeURIComponent(payload)}.png`;
}

export function parseDynamicQRToken(token: string): {
  tableId: string;
  venueId: string;
  sessionId: string;
  expiresAt: number;
} {
  // Decode and verify JWT
}
```

---

## Phase 2: Core Order Loop (Weeks 5–8)

### Step 2.1 — Session Creation

```typescript
// apps/web/src/app/api/sessions/scan/route.ts
export async function POST(req: Request) {
  const { qr_code, nfc_uid } = await req.json();
  
  // 1. Look up table by QR code or NFC UID
  const { data: table } = await supabase
    .from('venue_tables')
    .select('*, venues(*)')
    .or(`qr_code.eq.${qr_code},nfc_uid.eq.${nfc_uid}`)
    .single();
  
  if (!table) return Response.json({ error: 'Invalid code' }, { status: 404 });
  
  // 2. Check for existing open session
  const { data: existingSession } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('table_id', table.id)
    .eq('status', 'open')
    .single();
  
  const session = existingSession ?? await createNewSession(table);
  
  // 3. Generate session token (short-lived JWT)
  const sessionToken = generateSessionToken(session.id, table.venue_id, table.id);
  
  return Response.json({
    session_id: session.id,
    session_token: sessionToken,
    venue_id: table.venue_id,
    table_name: table.name,
    venue_name: table.venues.name,
    tab_mode: table.venues.tab_mode,
    currency: table.venues.currency,
  });
}
```

### Step 2.2 — Supabase Realtime Subscriptions

Guest app subscribes to order status:
```typescript
// apps/mobile/src/hooks/useOrderStatus.ts
export function useOrderStatus(orderId: string) {
  const [status, setStatus] = useState<string>('received');
  
  useEffect(() => {
    const channel = supabase
      .channel(`order:${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setStatus(payload.new.status);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);
  
  return status;
}
```

KDS subscribes to new orders:
```typescript
// apps/web/src/hooks/useKDSFeed.ts
export function useKDSFeed(venueId: string) {
  const [tickets, setTickets] = useState<Order[]>([]);
  
  useEffect(() => {
    const channel = supabase
      .channel(`kds:${venueId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `venue_id=eq.${venueId}`
      }, async (payload) => {
        // Fetch full order with items
        const order = await fetchOrderWithItems(payload.new.id);
        setTickets(prev => [order, ...prev]);
        // Play audio alert
        playKDSAlert();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [venueId]);
  
  return tickets;
}
```

### Step 2.3 — Payment Flow

Preauth flow (restaurant default):
```typescript
// apps/mobile/src/screens/Payment.tsx
async function setupPreauth() {
  // 1. Create SetupIntent
  const { client_secret } = await api.post('/payments/setup-intent', {
    session_id: sessionId,
    guest_id: guestId,
  });
  
  // 2. Present Stripe payment sheet
  const { error } = await initPaymentSheet({
    customerId: stripeCustomerId,
    customerEphemeralKeySecret: ephemeralKey,
    setupIntentClientSecret: client_secret,
    merchantDisplayName: venueName,
    applePay: { merchantCountryCode: 'US' },
    googlePay: { merchantCountryCode: 'US', testEnv: isDev },
  });
  
  if (!error) {
    const { error: presentError } = await presentPaymentSheet();
    if (!presentError) {
      // Card saved, preauth complete
      onPreauthComplete();
    }
  }
}
```

---

## Phase 3: Ops Layer (Weeks 9–12)

### Step 3.1 — Operator Dashboard Layout

```typescript
// apps/web/src/app/(dashboard)/layout.tsx
// Sidebar navigation with links to:
// /dashboard — live floor
// /menu — menu management
// /tables — table management
// /orders — order history
// /staff — staff management
// /inventory — inventory tracking
// /analytics — revenue + insights
// /settings — venue settings
```

### Step 3.2 — Menu Management

Implement full CRUD for menu categories and items. Image upload to Supabase Storage:

```typescript
async function uploadMenuItemImage(file: File, itemId: string): Promise<string> {
  const filename = `${itemId}/${Date.now()}.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage
    .from('menu-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    });
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('menu-images')
    .getPublicUrl(data.path);
    
  return publicUrl;
}
```

### Step 3.3 — POS Integration Layer

Create an adapter interface:
```typescript
// packages/types/src/pos.ts
export interface POSAdapter {
  syncMenu(venueId: string): Promise<MenuItem[]>;
  pushOrder(order: Order): Promise<string>; // returns POS order ID
  getOrderStatus(posOrderId: string): Promise<string>;
}

// Implement for each POS
export class ToastAdapter implements POSAdapter { ... }
export class SquareAdapter implements POSAdapter { ... }
export class CloverAdapter implements POSAdapter { ... }
export class StandaloneAdapter implements POSAdapter { ... } // no-op, TableFlow is POS
```

---

## Phase 4: AI Layer (Weeks 13–16)

### Step 4.1 — Edge Functions Setup

```bash
npx supabase functions new upsell-agent
npx supabase functions new demand-forecast
npx supabase functions new inventory-monitor
npx supabase functions new insights-generator
```

Each function uses the Anthropic SDK. Reference `05_AI_AGENTS.md` for exact prompts and response schemas.

```typescript
// supabase/functions/upsell-agent/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk';

const client = new Anthropic();

Deno.serve(async (req) => {
  const { cartItems, menu, venueId, timeOfDay, dayOfWeek } = await req.json();
  
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: UPSELL_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildUpsellPrompt({ cartItems, menu, timeOfDay, dayOfWeek })
    }]
  });
  
  const suggestions = JSON.parse(message.content[0].text);
  return Response.json(suggestions);
});
```

### Step 4.2 — pg_cron Jobs

```sql
-- Daily at 6 AM UTC — demand forecasting for all venues
select cron.schedule(
  'demand-forecast-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/demand-forecast',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Every order — inventory check (triggered by DB trigger, not cron)
create or replace function check_inventory_after_order()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/inventory-monitor',
    body := json_build_object('order_id', NEW.id, 'venue_id', NEW.venue_id)::text
  );
  return NEW;
end;
$$ language plpgsql;

create trigger inventory_check_on_order
after insert on orders
for each row execute function check_inventory_after_order();
```

---

## Phase 5: Polish + Launch (Weeks 17–20)

### Step 5.1 — Performance Requirements

- Implement `React.memo` on KDS ticket cards (re-renders are frequent)
- Use `useMemo` for menu category filtering
- Add Supabase `select` column limiting — never `select *` in production
- Implement optimistic UI for order placement (show "received" before server confirms)
- Add exponential backoff on Realtime reconnection

### Step 5.2 — Error Handling Standards

Every API route must:
1. Validate request body with Zod
2. Return typed errors using the error format in `03_API_SPEC.md`
3. Log to Supabase audit_log on state-changing operations
4. Never expose stack traces in production responses

```typescript
// packages/types/src/errors.ts
export class TableFlowError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function errorResponse(error: TableFlowError): Response {
  return Response.json(
    { error: { code: error.code, message: error.message, status: error.status } },
    { status: error.status }
  );
}
```

### Step 5.3 — Stripe Webhook Handler

```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'account.updated':
      await handleConnectAccountUpdate(event.data.object as Stripe.Account);
      break;
  }
  
  return Response.json({ received: true });
}
```

### Step 5.4 — Expo Push Notifications

```typescript
// apps/mobile/src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications(staffId: string) {
  if (!Device.isDevice) return;
  
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Save token to staff record
  await supabase.from('staff').update({ push_token: token }).eq('id', staffId);
}

// Send from server via Expo Push API
export async function sendPushToServer(staffPushToken: string, message: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: staffPushToken,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
    }),
  });
}
```

---

## Testing Requirements

| Layer | Framework | Coverage Target |
|---|---|---|
| API routes | Vitest + Supertest | 80% |
| Database functions | pgTAP | All RLS policies |
| UI components | React Testing Library | Critical paths only |
| E2E | Playwright | Full order flow, payment flow |
| Mobile | Detox | Scan → order → pay flow |

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx supabase start
      - run: npm run db:migrate
      - run: npm run test
      - run: npm run type-check
      - run: npm run lint
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npx vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      - run: npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Do Not Build (MVP Exclusions)

The following are explicitly out of scope and should not be built, planned for, or scaffolded:

- Loyalty / points / rewards system
- Reservation management
- Online ordering / delivery (off-premise orders)
- Multi-language / i18n
- Offline mode
- Payroll or tip distribution
- Customer-to-customer split bill negotiation UI
- Any native Windows or macOS desktop app

If a user story leads toward these areas, return to the spec and confirm scope before proceeding.
