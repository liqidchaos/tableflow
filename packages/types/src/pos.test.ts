import { describe, it, expect } from 'vitest';
import { StandaloneAdapter, createPOSAdapter } from './pos';

describe('POS adapters', () => {
  it('StandaloneAdapter returns TableFlow order id', async () => {
    const adapter = new StandaloneAdapter();
    const id = await adapter.pushOrder({ id: 'order-1' } as Parameters<typeof adapter.pushOrder>[0]);
    expect(id).toBe('tf-order-1');
  });

  it('createPOSAdapter defaults to standalone', () => {
    const adapter = createPOSAdapter(null);
    expect(adapter).toBeInstanceOf(StandaloneAdapter);
  });

  it('ToastAdapter throws not configured', async () => {
    const adapter = createPOSAdapter('toast');
    await expect(adapter.syncMenu('v1')).rejects.toThrow(/toast/i);
  });
});
