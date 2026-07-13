import { beforeEach, describe, expect, it, vi } from 'vitest';

const getStripe = vi.fn();
const getSupabase = vi.fn();
const auditLog = vi.fn();

vi.mock('@/lib/api', () => ({
  getStripe: () => getStripe(),
  getSupabase: () => getSupabase(),
  auditLog: (...args: unknown[]) => auditLog(...args),
  withHandler: async (handler: () => Promise<Response>) => {
    try {
      return await handler();
    } catch (err) {
      return Response.json(
        { error: { message: err instanceof Error ? err.message : String(err) } },
        { status: 500 }
      );
    }
  },
}));

vi.mock('@/lib/kitchen-enqueue', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kitchen-enqueue')>(
    '@/lib/kitchen-enqueue'
  );
  return {
    ...actual,
    enqueueOrderToKitchen: vi.fn(),
    enqueueSessionPendingOrders: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  headers: () => ({ get: () => null }),
}));

describe('stripe webhook fail-closed (TAB-13 S4)', () => {
  beforeEach(() => {
    vi.resetModules();
    getStripe.mockReset();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('returns 200 skipped when Stripe is not configured', async () => {
    getStripe.mockReturnValue(null);
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true, skipped: true });
  });

  it('returns 503 when Stripe is configured but webhook secret is missing', async () => {
    getStripe.mockReturnValue({ webhooks: { constructEvent: vi.fn() } });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'Webhook not configured' });
  });
});
