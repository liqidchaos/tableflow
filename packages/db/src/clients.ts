import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function createBrowserClient(): SupabaseClient {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Attach a Supabase Auth JWT to the Realtime socket so postgres_changes
 * respects RLS (staff policies). Guest session JWTs are NOT Supabase Auth
 * tokens — do not pass them here; use API polling instead.
 */
export async function attachRealtimeAuth(
  client: SupabaseClient,
  accessToken: string
): Promise<SupabaseClient> {
  await client.realtime.setAuth(accessToken);
  return client;
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Set it in the monorepo root .env.local or apps/web/.env.local.'
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Set it in the monorepo root .env.local or apps/web/.env.local.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient(url?: string, anonKey?: string): SupabaseClient {
  return createClient(
    url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!,
    anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  );
}
