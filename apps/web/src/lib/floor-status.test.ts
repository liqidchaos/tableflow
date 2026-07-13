import { describe, expect, it } from 'vitest';
import { deriveFloorStatus, isAttentionStage } from './floor-status';

describe('deriveFloorStatus', () => {
  it('returns empty when no open session', () => {
    expect(
      deriveFloorStatus({
        hasOpenSession: false,
        pendingRequestTypes: ['water'],
        orderStatuses: ['received'],
      })
    ).toBe('empty');
  });

  it('returns ordering for open session with no paid kitchen tickets', () => {
    expect(
      deriveFloorStatus({
        hasOpenSession: true,
        pendingRequestTypes: [],
        orderStatuses: [],
      })
    ).toBe('ordering');

    expect(
      deriveFloorStatus({
        hasOpenSession: true,
        pendingRequestTypes: [],
        orderStatuses: ['pending_payment'],
      })
    ).toBe('ordering');
  });

  it('returns eating after payment clears and kitchen sees the ticket', () => {
    expect(
      deriveFloorStatus({
        hasOpenSession: true,
        pendingRequestTypes: [],
        orderStatuses: ['received'],
      })
    ).toBe('eating');

    expect(
      deriveFloorStatus({
        hasOpenSession: true,
        pendingRequestTypes: [],
        orderStatuses: ['pending_payment', 'delivered'],
      })
    ).toBe('eating');
  });

  it('returns paying when guest requests the check', () => {
    expect(
      deriveFloorStatus({
        hasOpenSession: true,
        pendingRequestTypes: ['check'],
        orderStatuses: ['delivered'],
      })
    ).toBe('paying');
  });

  it('prioritizes needs_attention over paying for non-check requests', () => {
    expect(
      deriveFloorStatus({
        hasOpenSession: true,
        pendingRequestTypes: ['water', 'check'],
        orderStatuses: ['preparing'],
      })
    ).toBe('needs_attention');
  });
});

describe('isAttentionStage', () => {
  it('flags attention and paying', () => {
    expect(isAttentionStage('needs_attention')).toBe(true);
    expect(isAttentionStage('paying')).toBe(true);
    expect(isAttentionStage('eating')).toBe(false);
  });
});
