import { describe, expect, it, vi } from 'vitest';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { subscribeWithBackoff } from './realtime';

function mockClient(setAuth = vi.fn().mockResolvedValue(undefined)) {
  const subscribe = vi.fn((cb: (status: string) => void) => {
    cb('SUBSCRIBED');
    return { unsubscribe: vi.fn() };
  });
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe,
  } as unknown as RealtimeChannel;

  const removeChannel = vi.fn();
  const client = {
    channel: vi.fn(() => channel),
    removeChannel,
    realtime: { setAuth },
  } as unknown as SupabaseClient;

  return { client, channel, setAuth, removeChannel, subscribe };
}

describe('subscribeWithBackoff', () => {
  it('attaches accessToken via realtime.setAuth before subscribe', async () => {
    const { client, setAuth, subscribe } = mockClient();
    const token = 'staff-jwt';

    const teardown = subscribeWithBackoff(
      client,
      'kds:venue',
      (ch) => ch,
      { accessToken: token }
    );

    await vi.waitFor(() => expect(setAuth).toHaveBeenCalledWith(token));
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalled());
    expect(setAuth.mock.invocationCallOrder[0]).toBeLessThan(
      subscribe.mock.invocationCallOrder[0]
    );

    teardown();
  });

  it('subscribes without setAuth when no accessToken', async () => {
    const { client, setAuth, subscribe } = mockClient();

    const teardown = subscribeWithBackoff(client, 'anon', (ch) => ch);
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalled());
    expect(setAuth).not.toHaveBeenCalled();
    teardown();
  });
});
