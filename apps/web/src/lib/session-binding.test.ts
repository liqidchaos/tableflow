import { describe, expect, it } from 'vitest';
import { TableFlowError } from '@tableflow/types';
import {
  assertAmountCoversOrderSubtotal,
  assertSessionId,
  assertTabModeAllowsSessionClearance,
} from './session-binding';
import type { SessionTokenPayload } from '@tableflow/db';

const auth: SessionTokenPayload = {
  session_id: '11111111-1111-1111-1111-111111111111',
  venue_id: '22222222-2222-2222-2222-222222222222',
  table_id: '33333333-3333-3333-3333-333333333333',
  guest_id: '44444444-4444-4444-4444-444444444444',
};

describe('session binding (BOLA regression)', () => {
  it('rejects mismatched session ids', () => {
    expect(() =>
      assertSessionId(auth, '55555555-5555-5555-5555-555555555555')
    ).toThrow(TableFlowError);
  });

  it('allows matching session ids', () => {
    expect(() => assertSessionId(auth, auth.session_id)).not.toThrow();
  });

  it('rejects underpayment against order subtotal', () => {
    expect(() => assertAmountCoversOrderSubtotal(12.5, 100)).toThrow(TableFlowError);
  });

  it('accepts amount that covers order subtotal', () => {
    expect(() => assertAmountCoversOrderSubtotal(12.5, 1250)).not.toThrow();
    expect(() => assertAmountCoversOrderSubtotal(12.5, 1249)).not.toThrow(); // 1¢ drift
  });

  it('rejects amount more than 1¢ under', () => {
    expect(() => assertAmountCoversOrderSubtotal(12.5, 1248)).toThrow(TableFlowError);
  });
});

describe('session clearance tab_mode gate (TAB-65)', () => {
  it('rejects pay_per_order (pay-before-kitchen invariant)', () => {
    expect(() => assertTabModeAllowsSessionClearance('pay_per_order')).toThrow(TableFlowError);
    expect(() => assertTabModeAllowsSessionClearance(null)).toThrow(TableFlowError);
    expect(() => assertTabModeAllowsSessionClearance(undefined)).toThrow(TableFlowError);
  });

  it('allows preauth and bar_tab', () => {
    expect(() => assertTabModeAllowsSessionClearance('preauth')).not.toThrow();
    expect(() => assertTabModeAllowsSessionClearance('bar_tab')).not.toThrow();
  });

  it('rejects under-authorization against pending session liability', () => {
    expect(() => assertAmountCoversOrderSubtotal(42.0, 100)).toThrow(TableFlowError);
    expect(() => assertAmountCoversOrderSubtotal(42.0, 4200)).not.toThrow();
  });
});
