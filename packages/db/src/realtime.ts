import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { attachRealtimeAuth } from './clients';

const MAX_BACKOFF_MS = 30_000;

export interface SubscribeWithBackoffOptions {
  /** Supabase Auth access token (staff/owner). Required for RLS-gated postgres_changes. */
  accessToken?: string;
  onSubscribed?: () => void;
}

/**
 * Subscribe to a Supabase Realtime channel with exponential backoff on disconnect.
 * When `accessToken` is provided, attaches it to the Realtime socket before connecting.
 */
export function subscribeWithBackoff(
  supabase: SupabaseClient,
  channelName: string,
  setup: (channel: RealtimeChannel) => RealtimeChannel,
  onSubscribedOrOptions?: (() => void) | SubscribeWithBackoffOptions
): () => void {
  const options: SubscribeWithBackoffOptions =
    typeof onSubscribedOrOptions === 'function'
      ? { onSubscribed: onSubscribedOrOptions }
      : (onSubscribedOrOptions ?? {});

  let attempt = 0;
  let channel: RealtimeChannel | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let authReady: Promise<void> = Promise.resolve();

  if (options.accessToken) {
    authReady = attachRealtimeAuth(supabase, options.accessToken).then(() => undefined);
  }

  function connect() {
    if (stopped) return;
    channel = setup(supabase.channel(`${channelName}:${attempt}`));
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        attempt = 0;
        options.onSubscribed?.();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (channel) supabase.removeChannel(channel);
        channel = null;
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        timeoutId = setTimeout(() => {
          void authReady.then(connect);
        }, delay);
      }
    });
  }

  void authReady.then(connect);

  return () => {
    stopped = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (channel) supabase.removeChannel(channel);
  };
}
