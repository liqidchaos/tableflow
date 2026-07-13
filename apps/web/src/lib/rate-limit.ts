import { TableFlowError, throwError } from '@tableflow/types';
import { createServiceClient } from '@tableflow/db';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

function shouldUseMemoryBackend(): boolean {
  if (process.env.RATE_LIMIT_BACKEND === 'memory') return true;
  if (process.env.RATE_LIMIT_BACKEND === 'postgres') return false;
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/** Honor X-Forwarded-For only behind a trusted proxy (Vercel or TRUST_PROXY=1). */
export function trustForwardedClientIp(): boolean {
  const explicit = process.env.TRUST_PROXY;
  if (explicit === '0' || explicit === 'false') return false;
  if (explicit === '1' || explicit === 'true') return true;
  return process.env.VERCEL === '1';
}

export function clientIpFromRequest(req: Request): string {
  if (trustForwardedClientIp()) {
    const forwarded = req.headers.get('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    if (first) return first;
    const realIp = req.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
  }
  return 'unknown';
}

function memoryRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throwError('RATE_LIMITED', 'Too many requests. Please try again shortly.');
  }
}

async function durableRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('check_api_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });
  if (error) throw error;
  return data === true;
}

/**
 * Shared fixed-window rate limit. Uses Postgres (`api_rate_limits`) across
 * instances when configured; falls back to process memory if the RPC fails
 * or RATE_LIMIT_BACKEND=memory / test.
 */
export async function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS
): Promise<void> {
  if (shouldUseMemoryBackend()) {
    memoryRateLimit(key, limit, windowMs);
    return;
  }

  try {
    const allowed = await durableRateLimit(key, limit, windowMs);
    if (!allowed) {
      throwError('RATE_LIMITED', 'Too many requests. Please try again shortly.');
    }
  } catch (err) {
    if (err instanceof TableFlowError) throw err;
    console.warn('[rate-limit] durable backend unavailable; falling back to memory', err);
    memoryRateLimit(key, limit, windowMs);
  }
}

/** @deprecated Prefer checkRateLimit (async). Sync memory-only helper for legacy callers. */
export function rateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS
): void {
  memoryRateLimit(key, limit, windowMs);
}

export function rateLimitKey(req: Request, route: string): string {
  return `${route}:${clientIpFromRequest(req)}`;
}

/** Rate-limit an auth route by IP (e.g. `await rateLimitAuth(req, 'login', 10)`). */
export async function rateLimitAuth(req: Request, route: string, limit = 10): Promise<void> {
  await checkRateLimit(rateLimitKey(req, `auth/${route}`), limit);
}

/** Test helper */
export function _resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
