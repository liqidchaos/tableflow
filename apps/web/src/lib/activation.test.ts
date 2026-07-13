import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  auditLog: vi.fn(async () => undefined),
}));

describe('activation', () => {
  it('trackActivationEvent writes activation.* audit action', async () => {
    const { auditLog } = await import('@/lib/api');
    const { trackActivationEvent } = await import('./activation');
    await trackActivationEvent('venue-1', 'user-1', 'stripe_connected', { source: 'test' });
    expect(auditLog).toHaveBeenCalledWith(
      'venue-1',
      'user-1',
      'activation.stripe_connected',
      'venue',
      'venue-1',
      expect.objectContaining({ source: 'test' })
    );
  });
});
