import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const VENUE_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORDER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TABLE_ID = '88888888-8888-4888-8888-888888888881';
const GUEST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REQUEST_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ACCESS_TOKEN = 'mock-access-token';
const SESSION_TOKEN = 'mock-session-token';
const EVIDENCE_DIR = path.join(process.cwd(), 'e2e', '.evidence', 'tab15');

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function shot(page: import('@playwright/test').Page, name: string) {
  ensureEvidenceDir();
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, name),
    fullPage: false,
  });
}

async function seedStaffSession(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(
    ({ vid, token }) => {
      localStorage.setItem('venue_id', vid);
      localStorage.setItem('venue_name', 'The Rusty Anchor');
      localStorage.setItem('access_token', token);
    },
    { vid: VENUE_ID, token: ACCESS_TOKEN }
  );
}

async function mockGuestScanApis(page: import('@playwright/test').Page) {
  await page.route('**/api/sessions/scan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: SESSION_ID,
        session_token: SESSION_TOKEN,
        venue_id: VENUE_ID,
        table_id: TABLE_ID,
        table_name: 'Table 1',
        venue_name: 'The Rusty Anchor',
        guest_id: GUEST_ID,
        tab_mode: 'pay_per_order',
        currency: 'usd',
        brand_color: '#E84B2C',
      }),
    });
  });

  await page.route(`**/api/sessions/${SESSION_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: SESSION_ID,
        total_amount: 28,
        status: 'open',
      }),
    });
  });

  await page.route(`**/api/venues/${VENUE_ID}/menu`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        venue_id: VENUE_ID,
        categories: [
          {
            id: 'cat-1',
            name: 'Mains',
            items: [
              {
                id: 'item-1',
                name: 'Wagyu Burger',
                description: '8oz wagyu',
                price: 28,
                is_available: true,
                allergens: ['gluten'],
                dietary_tags: [],
              },
            ],
          },
        ],
      }),
    });
  });

  await page.route('**/api/orders', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          order_id: ORDER_ID,
          status: 'pending_payment',
          subtotal: 28,
          estimated_prep_minutes: 14,
          upsell_suggestions: [],
        }),
      });
    }
  });

  await page.route(`**/api/orders/${ORDER_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: ORDER_ID, status: 'pending_payment' }),
    });
  });
}

async function guestCheckoutToPay(page: import('@playwright/test').Page) {
  await page.goto('/g/tf_t_88888888_a1b2c3d4');
  await expect(page.getByText('The Rusty Anchor').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Wagyu Burger')).toBeVisible();

  await page.getByText('Wagyu Burger').click();
  await page.getByRole('button', { name: /Add to cart/i }).click();
  await page.locator('button').filter({ hasText: 'View cart' }).click();
  await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible();
  await page.getByRole('button', { name: /Continue to pay/i }).click();
  await expect(page.getByRole('heading', { name: 'Pay for Order' })).toBeVisible({ timeout: 10000 });
}

test.describe('smoke', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Redefining The Flow of Fine Dining.' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reserve' })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  });
});

test.describe('order flow (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGuestScanApis(page);

    await page.route('**/api/payments/intent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payments_disabled: true,
          message:
            'Pay at the counter. Your order stays with the server until payment clears — the kitchen will not start yet.',
        }),
      });
    });

    await page.route(`**/api/venues/${VENUE_ID}/kds`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: [
            {
              order_id: ORDER_ID,
              table_name: 'Table 1',
              status: 'received',
              received_at: new Date().toISOString(),
              age_minutes: 1,
              items: [
                {
                  id: 'oi-1',
                  name: 'Wagyu Burger',
                  quantity: 1,
                  modifiers: ['No onion'],
                  special_instructions: null,
                  course: 'main',
                  status: 'pending',
                },
              ],
            },
            // Leaked unpaid row must never render (client + server guards).
            {
              order_id: 'unpaid-should-hide',
              table_name: 'Table 99',
              status: 'pending_payment',
              received_at: new Date().toISOString(),
              age_minutes: 0,
              items: [
                {
                  id: 'oi-unpaid',
                  name: 'Hidden Unpaid Item',
                  quantity: 1,
                  modifiers: [],
                  special_instructions: null,
                  course: 'main',
                  status: 'pending',
                },
              ],
            },
          ],
        }),
      });
    });

    await page.route(`**/api/orders/${ORDER_ID}/status`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: ORDER_ID, status: 'preparing' }),
      });
    });
  });

  test('guest web scan → menu → cart → pay gate', async ({ page }) => {
    await guestCheckoutToPay(page);
    await expect(page.getByText(/Kitchen starts after payment clears/i)).toBeVisible();
    await expect(page.getByLabel('Payment').getByText('$28.00')).toBeVisible();
    await shot(page, '01-guest-pay-gate.png');

    await page.getByRole('button', { name: /Continue to pay ·/i }).click();
    await expect(page.getByText(/kitchen will not start yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay at Counter' })).toBeVisible();
    await shot(page, '02-guest-pay-at-counter.png');
  });

  test('KDS shows paid ticket only', async ({ page }) => {
    await seedStaffSession(page);
    await page.goto('/kds');
    await expect(page.getByText('Kitchen Display').first()).toBeVisible();
    await expect(page.getByText('Paid tickets only')).toBeVisible();
    await expect(page.getByText('Table 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Wagyu Burger')).toBeVisible();
    await expect(page.getByText('· No onion')).toBeVisible();
    await expect(page.getByText('Paid').first()).toBeVisible();
    await expect(page.getByText('Table 99')).toHaveCount(0);
    await expect(page.getByText('Hidden Unpaid Item')).toHaveCount(0);
    await shot(page, '03-kds-paid-only.png');
  });
});

test.describe('payment failure / unpaid invariant (mocked)', () => {
  test('declined card never reaches KDS', async ({ page }) => {
    await mockGuestScanApis(page);

    await page.route('**/api/payments/intent', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'PAYMENT_DECLINED',
            message: 'Your card was declined. Kitchen will not start until payment clears.',
          },
        }),
      });
    });

    // KDS feed contains only an unpaid leak candidate — both must stay hidden/empty.
    await page.route(`**/api/venues/${VENUE_ID}/kds`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tickets: [
            {
              order_id: ORDER_ID,
              table_name: 'Table 1',
              status: 'pending_payment',
              received_at: new Date().toISOString(),
              age_minutes: 0,
              items: [
                {
                  id: 'oi-unpaid',
                  name: 'Wagyu Burger',
                  quantity: 1,
                  modifiers: [],
                  special_instructions: null,
                  course: 'main',
                  status: 'pending',
                },
              ],
            },
          ],
        }),
      });
    });

    await guestCheckoutToPay(page);
    await page.getByRole('button', { name: /Continue to pay ·/i }).click();
    await expect(
      page.getByText(/Your card was declined\. Kitchen will not start until payment clears\./i)
    ).toBeVisible({ timeout: 10000 });
    await shot(page, '04-guest-payment-declined.png');

    await seedStaffSession(page);
    await page.goto('/kds');
    await expect(page.getByText('Kitchen Display').first()).toBeVisible();
    await expect(page.getByText('Paid tickets only')).toBeVisible();
    // Unpaid pending_payment must never render as a ticket.
    await expect(page.getByText('Wagyu Burger')).toHaveCount(0);
    await expect(page.getByText('Table 1')).toHaveCount(0);
    await shot(page, '05-kds-empty-after-decline.png');
  });
});

test.describe('floor request routing (mocked)', () => {
  test('floor shows session stage and routes guest request to assigned server', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: 'user-1',
          venue_id: VENUE_ID,
          venue_name: 'The Rusty Anchor',
          role: 'owner',
        }),
      });
    });

    await page.route(`**/api/venues/${VENUE_ID}/floor`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tables: [
            {
              id: TABLE_ID,
              name: 'Table 1',
              capacity: 4,
              status: 'ordering',
              guest_count: 2,
              open_orders: 1,
              pending_requests: 1,
              session_id: SESSION_ID,
              assigned_staff_id: 'staff-1',
              assigned_staff_name: 'Alex Server',
              seated_at: new Date().toISOString(),
              duration_minutes: 12,
            },
            {
              id: '88888888-8888-4888-8888-888888888882',
              name: 'Table 2',
              capacity: 2,
              status: 'empty',
              guest_count: 0,
              open_orders: 0,
              pending_requests: 0,
              session_id: null,
              assigned_staff_id: null,
              assigned_staff_name: null,
              seated_at: null,
              duration_minutes: 0,
            },
          ],
        }),
      });
    });

    await page.route(`**/api/venues/${VENUE_ID}/requests?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requests: [
            {
              id: REQUEST_ID,
              table_id: TABLE_ID,
              table_name: 'Table 1',
              request_type: 'water',
              custom_text: null,
              status: 'pending',
              created_at: new Date().toISOString(),
              assigned_staff_id: 'staff-1',
            },
          ],
        }),
      });
    });

    await page.route(`**/api/venues/${VENUE_ID}/requests*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requests: [
            {
              id: REQUEST_ID,
              table_id: TABLE_ID,
              table_name: 'Table 1',
              request_type: 'water',
              custom_text: null,
              status: 'pending',
              created_at: new Date().toISOString(),
              assigned_staff_id: 'staff-1',
            },
          ],
        }),
      });
    });

    await seedStaffSession(page);
    await page.goto('/floor');

    await expect(page.getByRole('heading', { name: 'Floor Status' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Water requested at Table 1')).toBeVisible();
    await expect(page.getByText(/Route → Alex Server/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fulfill' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Table 1' })).toBeVisible();
    await expect(page.getByText('Ordering').first()).toBeVisible();
    await expect(page.getByText('Alex Server').first()).toBeVisible();
    await shot(page, '06-floor-request-routing.png');
  });
});
