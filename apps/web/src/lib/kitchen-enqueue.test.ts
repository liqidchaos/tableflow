import { describe, expect, it } from 'vitest';
import {
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
