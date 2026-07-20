import { describe, expect, it } from 'vitest';
import {
  enqueueSessionPendingOrders,
  isKdsVisibleStatus,
  isPaymentClearedForKitchen,
  shouldEnqueueOnOrderCreate,
  shouldEnqueueSessionPendingOnPayment,
} from './kitchen-enqueue';

describe('pay-before-fire gate', () => {
  it('treats authorized and captured as cleared', () => {
    expect(isPaymentClearedForKitchen('authorized')).toBe(true);
    expect(isPaymentClearedForKitchen('captured')).toBe(true);
    expect(isPaymentClearedForKitchen('pending')).toBe(false);
    expect(isPaymentClearedForKitchen('failed')).toBe(false);
    expect(isPaymentClearedForKitchen(null)).toBe(false);
  });

  it('never auto-enqueues pay_per_order on create', () => {
    expect(
      shouldEnqueueOnOrderCreate({
        tabMode: 'pay_per_order',
        sessionHasClearedPayment: true,
        venuePaymentsEnabled: true,
      })
    ).toEqual({ enqueue: false, reason: 'awaiting_order_payment' });
  });

  it('enqueues preauth only when session payment is cleared', () => {
    expect(
      shouldEnqueueOnOrderCreate({
        tabMode: 'preauth',
        sessionHasClearedPayment: true,
        venuePaymentsEnabled: true,
      })
    ).toEqual({ enqueue: true, reason: 'session_payment_cleared' });

    expect(
      shouldEnqueueOnOrderCreate({
        tabMode: 'preauth',
        sessionHasClearedPayment: false,
        venuePaymentsEnabled: true,
      })
    ).toEqual({ enqueue: false, reason: 'awaiting_session_authorization' });
  });

  it('blocks auto-enqueue when venue payments are disabled', () => {
    expect(
      shouldEnqueueOnOrderCreate({
        tabMode: 'preauth',
        sessionHasClearedPayment: true,
        venuePaymentsEnabled: false,
      })
    ).toEqual({ enqueue: false, reason: 'payments_disabled_requires_staff_fire' });
  });

  it('keeps pending_payment off the KDS', () => {
    expect(isKdsVisibleStatus('pending_payment')).toBe(false);
    expect(isKdsVisibleStatus('received')).toBe(true);
    expect(isKdsVisibleStatus('preparing')).toBe(true);
    expect(isKdsVisibleStatus('ready')).toBe(true);
    expect(isKdsVisibleStatus('cancelled')).toBe(false);
  });

  it('does not session-promote pending orders for pay_per_order (TAB-42)', () => {
    expect(shouldEnqueueSessionPendingOnPayment('pay_per_order')).toBe(false);
    expect(shouldEnqueueSessionPendingOnPayment('preauth')).toBe(true);
    expect(shouldEnqueueSessionPendingOnPayment('bar_tab')).toBe(true);
  });
});

describe('enqueueSessionPendingOrders (TAB-42)', () => {
  function createSupabaseMock(
    sessionId: string,
    pending: { id: string }[],
    failed: { order_id: string }[]
  ) {
    const orders = pending.map((order) => ({
      id: order.id,
      session_id: sessionId,
      status: 'pending_payment' as const,
    }));
    const orderStatus = new Map<string, 'pending_payment' | 'received'>();
    orders.forEach((order) => orderStatus.set(order.id, 'pending_payment'));

    function createOrdersQuery() {
      let selectFields = '';
      const filters: Array<{ field: string; value: unknown }> = [];
      let isUpdate = false;

      const buildResult = () => {
        if (selectFields === 'id') {
          const sessionFilter = filters.find((f) => f.field === 'session_id')?.value;
          const statusFilter = filters.find((f) => f.field === 'status')?.value;
          return {
            data: orders
              .filter(
                (order) =>
                  (!sessionFilter || order.session_id === sessionFilter) &&
                  (!statusFilter || order.status === statusFilter)
              )
              .map((order) => ({ id: order.id })),
          };
        }

        if (selectFields === 'id, status') {
          const idFilter = filters.find((f) => f.field === 'id')?.value;
          if (!idFilter) {
            return { data: null };
          }
          const status = orderStatus.get(idFilter as string);
          return { data: status ? { id: idFilter, status } : null };
        }

        return { data: null };
      };

      return {
        select(fields: string) {
          selectFields = fields;
          return this;
        },
        eq(field: string, value: unknown) {
          filters.push({ field, value });
          return this;
        },
        in() {
          return this;
        },
        update() {
          isUpdate = true;
          return this;
        },
        async single() {
          return buildResult();
        },
        async maybeSingle() {
          if (isUpdate) {
            const idFilter = filters.find((f) => f.field === 'id');
            const statusFilter = filters.find((f) => f.field === 'status');
            if (!idFilter) return { data: null };
            const currentStatus = orderStatus.get(idFilter.value as string);
            if (!currentStatus) return { data: null };
            if (statusFilter && statusFilter.value !== currentStatus) {
              return { data: null };
            }
            orderStatus.set(idFilter.value as string, 'received');
            const entry = orders.find((order) => order.id === idFilter.value);
            if (entry) {
              entry.status = 'received';
            }
            return { data: { id: idFilter.value } };
          }
          return buildResult();
        },
        async then(resolve: (value: { data: any }) => unknown) {
          return resolve(buildResult());
        },
      };
    }

    return {
      from(table: string) {
        if (table === 'orders') {
          return createOrdersQuery();
        }
        if (table === 'payments') {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            in() {
              return this;
            },
            async then(resolve: (value: { data: { order_id: string }[] }) => unknown) {
              return resolve({ data: failed });
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  it('skips orders that already have failed payments', async () => {
    const supabase = createSupabaseMock(
      'session-1',
      [
        { id: 'order-failed' },
        { id: 'order-ok' },
      ],
      [{ order_id: 'order-failed' }]
    );

    const result = await enqueueSessionPendingOrders(supabase as never, 'session-1');
    expect(result).toEqual(['order-ok']);
  });
});
