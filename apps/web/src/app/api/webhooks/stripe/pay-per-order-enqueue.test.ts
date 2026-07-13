import { beforeEach, describe, expect, it, vi } from 'vitest';

const auditLog = vi.fn();
const enqueueOrderToKitchen = vi.fn();
const enqueueSessionPendingOrders = vi.fn();

vi.mock('@/lib/api', () => ({
  getStripe: vi.fn(),
  getSupabase: vi.fn(),
  auditLog: (...args: unknown[]) => auditLog(...args),
  withHandler: async (handler: () => Promise<Response>) => handler(),
}));

vi.mock('@/lib/kitchen-enqueue', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kitchen-enqueue')>(
    '@/lib/kitchen-enqueue'
  );
  return {
    ...actual,
    enqueueOrderToKitchen: (...args: unknown[]) => enqueueOrderToKitchen(...args),
    enqueueSessionPendingOrders: (...args: unknown[]) => enqueueSessionPendingOrders(...args),
  };
});

vi.mock('next/headers', () => ({
  headers: () => ({ get: () => null }),
}));

function mockSessionLookup(tabMode: string) {
  return {
    from: (table: string) => {
      if (table !== 'table_sessions') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { tab_mode: tabMode }, error: null }),
          }),
        }),
      };
    },
  };
}

describe('fireKitchenAfterPayment tab-mode gate (TAB-42)', () => {
  beforeEach(() => {
    vi.resetModules();
    auditLog.mockReset();
    enqueueOrderToKitchen.mockReset();
    enqueueSessionPendingOrders.mockReset();
    enqueueOrderToKitchen.mockResolvedValue({ enqueued: true, orderId: 'order-paid' });
    enqueueSessionPendingOrders.mockResolvedValue(['order-unpaid', 'order-paid']);
  });

  it('pay_per_order: enqueues only the paid order, never session pending', async () => {
    const { fireKitchenAfterPayment } = await import('./fire-kitchen-after-payment');
    const supabase = mockSessionLookup('pay_per_order');

    await fireKitchenAfterPayment(supabase as never, {
      venueId: 'venue-1',
      sessionId: 'session-1',
      orderId: 'order-paid',
      source: 'payment_intent.succeeded',
    });

    expect(enqueueOrderToKitchen).toHaveBeenCalledWith(
      supabase,
      'order-paid',
      expect.objectContaining({ paidAt: expect.any(String) })
    );
    expect(enqueueSessionPendingOrders).not.toHaveBeenCalled();
  });

  it('pay_per_order decline-then-success: unpaid sibling stays off kitchen path', async () => {
    // Mirrors live TAB-28: order A failed payment stays pending_payment;
    // order B succeeds — must not promote A via session enqueue.
    const unpaidOrderId = '75944a3c-6aa7-46e1-83d2-980622acd42f';
    const paidOrderId = '0e79ca17-9e56-418a-95c4-e9c0e0185e62';

    enqueueOrderToKitchen.mockImplementation(async (_sb, orderId: string) => ({
      enqueued: orderId === paidOrderId,
      orderId,
    }));

    const { fireKitchenAfterPayment } = await import('./fire-kitchen-after-payment');
    const supabase = mockSessionLookup('pay_per_order');

    await fireKitchenAfterPayment(supabase as never, {
      venueId: 'venue-1',
      sessionId: 'bfbbb169-b032-4f88-971b-d05329bb0604',
      orderId: paidOrderId,
      source: 'payment_intent.succeeded',
    });

    expect(enqueueOrderToKitchen).toHaveBeenCalledTimes(1);
    expect(enqueueOrderToKitchen).toHaveBeenCalledWith(
      supabase,
      paidOrderId,
      expect.any(Object)
    );
    expect(enqueueSessionPendingOrders).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      'venue-1',
      null,
      'kitchen.enqueued',
      'order',
      paidOrderId,
      expect.any(Object)
    );
    expect(auditLog.mock.calls.some((c) => c[4] === unpaidOrderId)).toBe(false);
  });

  it('preauth: still promotes remaining pending session orders', async () => {
    const { fireKitchenAfterPayment } = await import('./fire-kitchen-after-payment');
    const supabase = mockSessionLookup('preauth');

    await fireKitchenAfterPayment(supabase as never, {
      venueId: 'venue-1',
      sessionId: 'session-1',
      orderId: 'order-paid',
      source: 'payment_intent.amount_capturable_updated',
    });

    expect(enqueueOrderToKitchen).toHaveBeenCalled();
    expect(enqueueSessionPendingOrders).toHaveBeenCalledWith(
      supabase,
      'session-1',
      expect.objectContaining({ paidAt: expect.any(String) })
    );
  });

  it('bar_tab: still promotes remaining pending session orders', async () => {
    const { fireKitchenAfterPayment } = await import('./fire-kitchen-after-payment');
    const supabase = mockSessionLookup('bar_tab');

    await fireKitchenAfterPayment(supabase as never, {
      venueId: 'venue-1',
      sessionId: 'session-1',
      orderId: null,
      source: 'payment_intent.succeeded',
    });

    expect(enqueueOrderToKitchen).not.toHaveBeenCalled();
    expect(enqueueSessionPendingOrders).toHaveBeenCalledWith(
      supabase,
      'session-1',
      expect.any(Object)
    );
  });
});
