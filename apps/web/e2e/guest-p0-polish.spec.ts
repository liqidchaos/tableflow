import { test, expect, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const VENUE_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORDER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TABLE_ID = '88888888-8888-4888-8888-888888888881';
const GUEST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION_TOKEN = 'mock-session-token';
const EVIDENCE_DIR = path.join(process.cwd(), 'e2e', '.evidence', 'tab29');

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

async function mockHappyGuestApis(page: import('@playwright/test').Page) {
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
        brand_color: '#f2ca50',
      }),
    });
  });

  await page.route(`**/api/sessions/${SESSION_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: SESSION_ID, total_amount: 28, status: 'open' }),
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

test.describe('TAB-29 guest P0 polish', () => {
  test('error recovery — mobile 390×844', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.route('**/api/sessions/scan', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid QR code' } }),
      });
    });

    await page.goto('/g/invalid-qr-tab20');
    await expect(page.getByRole('heading', { name: /couldn't open this table/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ask a server/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();
    await shot(page, 'error-390x844.png');
    await context.close();
  });

  test('error recovery — desktop 1440×900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route('**/api/sessions/scan', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid QR code' } }),
      });
    });

    await page.goto('/g/invalid-qr-tab20');
    await expect(page.getByRole('heading', { name: /couldn't open this table/i })).toBeVisible();
    await shot(page, 'error-1440x900.png');
  });

  test('loading — mobile 390×844', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.route('**/api/sessions/scan', async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'timeout' } }),
      });
    });

    const nav = page.goto('/g/loading-qr-tab20');
    await expect(page.getByText(/Getting your menu/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('progressbar', { name: /Loading menu/i })).toBeVisible();
    await shot(page, 'loading-390x844.png');
    await nav.catch(() => undefined);
    await context.close();
  });

  test('loading — desktop 1440×900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route('**/api/sessions/scan', async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'timeout' } }),
      });
    });

    const nav = page.goto('/g/loading-qr-tab20');
    await expect(page.getByText(/Getting your menu/i)).toBeVisible({ timeout: 5000 });
    await shot(page, 'loading-1440x900.png');
    await nav.catch(() => undefined);
  });

  test('mobile menu sheet is wired (no dead hamburger)', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await mockHappyGuestApis(page);
    await page.goto('/g/tf_t_88888888_a1b2c3d4');
    await expect(page.getByRole('heading', { name: /Good evening/i })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'Open menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Guest menu' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Concierge/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /^Menu$/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Call server' })).toBeVisible();
    await shot(page, 'mobile-menu-sheet-390x844.png');
    await context.close();
  });

  test('desktop CTA is Call server', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockHappyGuestApis(page);
    await page.goto('/g/tf_t_88888888_a1b2c3d4');
    await expect(page.getByRole('heading', { name: /Good evening/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: 'Call server' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sommelier/i })).toHaveCount(0);
    await shot(page, 'desktop-call-server-1440x900.png');
  });

  test('payment failure uses error tokens + alert', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await mockHappyGuestApis(page);
    await page.route('**/api/payments/intent', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Your card was declined. Try another card or ask your server.' },
        }),
      });
    });

    await page.goto('/g/tf_t_88888888_a1b2c3d4');
    await expect(page.getByRole('heading', { name: /Good evening/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: /Wagyu Burger/i }).click();
    await page.getByRole('button', { name: /Add to cart/i }).click();
    await page.locator('button').filter({ hasText: 'View cart' }).click();
    await page.getByRole('button', { name: /Continue to pay/i }).click();
    await expect(page.getByRole('heading', { name: 'Pay for Order' })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: /Continue to pay/i }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/declined/i);
    await expect(alert).toHaveClass(/border-error\/40/);
    await expect(alert).toHaveClass(/bg-error\/10/);
    await expect(alert).toHaveClass(/text-error/);
    await shot(page, 'payment-failure-390x844.png');

    await page.setViewportSize({ width: 1440, height: 900 });
    await shot(page, 'payment-failure-1440x900.png');
    await context.close();
  });

  test('Pay later shows pending_payment dock', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await mockHappyGuestApis(page);

    await page.goto('/g/tf_t_88888888_a1b2c3d4');
    await expect(page.getByRole('heading', { name: /Good evening/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: /Wagyu Burger/i }).click();
    await page.getByRole('button', { name: /Add to cart/i }).click();
    await page.locator('button').filter({ hasText: 'View cart' }).click();
    await page.getByRole('button', { name: /Continue to pay/i }).click();
    await expect(page.getByRole('heading', { name: 'Pay for Order' })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: 'Pay later' }).click();

    const dock = page.locator('#guest-order-status-dock');
    await expect(dock).toBeVisible();
    await expect(dock.getByText('Pay to send to kitchen')).toBeVisible();
    const inView = await dock.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    });
    expect(inView).toBe(true);
    await shot(page, 'pay-later-dock-390x844.png');
    await context.close();
  });
});
