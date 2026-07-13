/**
 * TAB-28 live staging acceptance — real Stripe test mode + Supabase.
 * Run against an already-running server on :3002 with `stripe listen` forwarding.
 *
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 npx playwright test e2e/tab28-live-staging.spec.ts --config=playwright.live.config.ts
 */
import { test, expect, type Page, type FrameLocator } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const QR = 'tf_t_6769b4fc_8001b814';
const GUEST_URL = `/g/${QR}`;
const STAFF_EMAIL = process.env.TAB28_QA_EMAIL ?? 'qa.staging.tab28@tableflow.app';
const STAFF_PASSWORD = process.env.TAB28_QA_PASSWORD ?? 'TableFlow-QA-Staging-28!';
const EVIDENCE_DIR = path.join(process.cwd(), 'e2e', '.evidence', 'tab28');

const CARD_SUCCESS = {
  number: '4242424242424242',
  exp: '12/34',
  cvc: '123',
  zip: '10001',
};
const CARD_DECLINE = {
  number: '4000000000000002',
  exp: '12/34',
  cvc: '123',
  zip: '10001',
};

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function shot(page: Page, name: string) {
  ensureEvidenceDir();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name), fullPage: false });
}

async function staffLogin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(STAFF_EMAIL);
  await page.getByPlaceholder('Password').fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
}

async function addBurgerAndOpenPay(page: Page) {
  await page.goto(GUEST_URL);
  await expect(page.getByText('QA Staging Anchor', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByText('Wagyu Burger', { exact: true }).first().click();
  await page.getByRole('button', { name: /Add to cart/i }).click();
  await page.getByLabel('View cart').click();
  await expect(page.getByText(/1×\s*Wagyu Burger|Wagyu Burger/).first()).toBeVisible();
  await page.getByRole('button', { name: /Continue to pay/i }).click();
  await expect(page.getByText(/Kitchen starts after payment clears/i)).toBeVisible({
    timeout: 15_000,
  });
}

async function lockTipAndContinue(page: Page) {
  // Prefer 18% tip if tip picker is shown
  const tip18 = page.getByRole('button', { name: /^18%/ });
  if (await tip18.isVisible().catch(() => false)) {
    await tip18.click();
  }
  const continuePay = page.getByRole('button', { name: /Continue to pay/i });
  await expect(continuePay).toBeVisible({ timeout: 10_000 });
  await continuePay.click();
  await expect(page.getByRole('button', { name: /Pay Now/i })).toBeVisible({
    timeout: 30_000,
  });
}

function paymentFrame(page: Page): FrameLocator {
  // Stripe Payment Element uses nested private frames; try common selectors.
  return page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
}

async function fillStripeCard(
  page: Page,
  card: { number: string; exp: string; cvc: string; zip: string }
) {
  // Prefer Card tab; ignore Stripe metrics iframes (aria-hidden / not visible).
  const cardTab = page.getByRole('tab', { name: /^Card$/i }).or(page.getByRole('button', { name: /^Card$/i }));
  if (await cardTab.first().isVisible().catch(() => false)) {
    await cardTab.first().click();
  }

  await expect(
    page.locator('iframe[title*="Secure payment"], iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])').first()
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  async function tryFill(): Promise<boolean> {
    for (const frame of page.frames()) {
      const number = frame
        .getByPlaceholder(/card number/i)
        .or(frame.locator('[name="number"], [autocomplete="cc-number"]'));
      if ((await number.count()) === 0) continue;
      try {
        await number.first().fill(card.number, { timeout: 5_000 });
        const exp = frame
          .getByPlaceholder(/expir/i)
          .or(frame.locator('[name="expiry"], [autocomplete="cc-exp"]'));
        if (await exp.count()) await exp.first().fill(card.exp);
        const cvc = frame
          .getByPlaceholder(/cvc|security/i)
          .or(frame.locator('[name="cvc"], [autocomplete="cc-csc"]'));
        if (await cvc.count()) await cvc.first().fill(card.cvc);
        const zip = frame
          .getByPlaceholder(/zip|postal/i)
          .or(frame.locator('[name="postalCode"], [autocomplete="postal-code"]'));
        if (await zip.count()) await zip.first().fill(card.zip);
        return true;
      } catch {
        /* try next frame */
      }
    }
    return false;
  }

  let filled = await tryFill();
  if (!filled) {
    await page.waitForTimeout(1000);
    filled = await tryFill();
  }
  expect(filled, 'Stripe card fields not found in Payment Element iframes').toBe(true);
}

test.describe.configure({ mode: 'serial' });

test.describe('TAB-28 live staging A–D', () => {
  test.setTimeout(180_000);

  test('A: guest scan → menu → cart → pay gate', async ({ page }) => {
    await page.goto(GUEST_URL);
    await expect(page.getByText('QA Staging Anchor', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Wagyu Burger', { exact: true }).first()).toBeVisible();
    await shot(page, '01-guest-menu.png');

    await page.getByText('Wagyu Burger', { exact: true }).first().click();
    await page.getByRole('button', { name: /Add to cart/i }).click();
    await page.getByLabel('View cart').click();
    await expect(page.getByText(/Wagyu Burger/).first()).toBeVisible();
    await shot(page, '02-guest-cart.png');

    await page.getByRole('button', { name: /Continue to pay/i }).click();
    await expect(page.getByText(/Kitchen starts after payment clears/i)).toBeVisible({
      timeout: 15_000,
    });
    await shot(page, '03-guest-pay-gate.png');
  });

  test('C then B: declined card never reaches KDS; success does', async ({ page, browser }) => {
    // --- Decline path ---
    await addBurgerAndOpenPay(page);
    await lockTipAndContinue(page);
    await fillStripeCard(page, CARD_DECLINE);
    await page.getByRole('button', { name: /Pay Now/i }).click();

    // Stripe decline surfaces as error alert in PaymentSheet
    await expect(
      page.getByRole('alert').or(page.getByText(/declined|failed|could not|insufficient/i))
    ).toBeVisible({ timeout: 45_000 });
    await shot(page, '04-guest-payment-declined.png');

    // Staff KDS — unpaid must not appear
    const staffCtx = await browser.newContext();
    const kds = await staffCtx.newPage();
    await staffLogin(kds);
    await kds.goto('/kds');
    await expect(kds.getByText(/Paid tickets only|Kitchen/i).first()).toBeVisible({
      timeout: 20_000,
    });
    // Give realtime a moment; unpaid leak would show Table 1 + Wagyu without Paid
    await kds.waitForTimeout(3000);
    await shot(kds, '05-kds-empty-after-decline.png');

    const body = await kds.locator('body').innerText();
    // If any Wagyu ticket is visible after decline-only, it must be from a prior paid order —
    // record ticket count for reporting; unpaid-only board should not newly enqueue.
    const unpaidLeak =
      /pending_payment/i.test(body) ||
      (/Table 1/i.test(body) && /Wagyu/i.test(body) && !/Paid/i.test(body));
    expect(unpaidLeak, 'Unpaid / pending_payment ticket leaked onto KDS after decline').toBe(
      false
    );

    // --- Success path (new guest page) ---
    const guest2 = await browser.newPage();
    await addBurgerAndOpenPay(guest2);
    await lockTipAndContinue(guest2);
    await fillStripeCard(guest2, CARD_SUCCESS);
    await guest2.getByRole('button', { name: /Pay Now/i }).click();
    await expect(guest2.getByText("You're all set", { exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(guest2.getByText(/Payment cleared/i)).toBeVisible();
    await shot(guest2, '06-guest-payment-success.png');

    // Wait for webhook → kitchen enqueue
    await kds.reload();
    await expect(kds.getByText(/Wagyu Burger|Table 1/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(kds.getByText(/Paid/i).first()).toBeVisible();
    await shot(kds, '07-kds-paid-ticket.png');

    await guest2.close();
    await staffCtx.close();
  });

  test('D: floor request routing + session stage', async ({ page, browser }) => {
    // Guest requests water
    await page.goto(GUEST_URL);
    await expect(page.getByText('QA Staging Anchor', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /Call server/i }).click();
    await page.getByRole('button', { name: /^Water$/i }).click();
    await expect(page.getByText(/Request sent/i)).toBeVisible({ timeout: 15_000 });
    await shot(page, '08-guest-water-request.png');

    const staffCtx = await browser.newContext();
    const floor = await staffCtx.newPage();
    await staffLogin(floor);
    await floor.goto('/floor');
    await expect(floor.getByText(/Floor|Table/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(floor.getByText(/Water requested|Water/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(floor.getByText(/Alex Server/i).first()).toBeVisible({ timeout: 15_000 });
    await shot(floor, '09-floor-request-routing.png');
    await staffCtx.close();
  });
});
