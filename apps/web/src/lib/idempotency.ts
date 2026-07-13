import type { SupabaseClient } from '@supabase/supabase-js';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export async function withIdempotency(
  supabase: SupabaseClient,
  req: Request,
  route: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const key = req.headers.get('idempotency-key');
  if (!key || key.length < 8 || key.length > 128) {
    return handler();
  }

  const { data: existing } = await supabase
    .from('api_idempotency_keys')
    .select('response_status, response_body, created_at')
    .eq('key', key)
    .eq('route', route)
    .maybeSingle();

  if (existing?.response_body != null && existing.response_status != null) {
    const age = Date.now() - new Date(existing.created_at).getTime();
    if (age < IDEMPOTENCY_TTL_MS) {
      return Response.json(existing.response_body, { status: existing.response_status });
    }
  }

  const response = await handler();
  const body = await response.clone().json().catch(() => null);
  if (body != null) {
    await supabase.from('api_idempotency_keys').upsert({
      key,
      route,
      response_status: response.status,
      response_body: body,
    });
  }
  return response;
}
