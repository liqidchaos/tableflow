import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';
import {
  TableFlowError,
  errorResponse,
  throwError,
} from '@tableflow/types';
import { createServiceClient } from '@tableflow/db';
import { verifySessionToken, extractBearerToken } from '@tableflow/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionTokenPayload } from '@tableflow/db';

export function getSupabase(): SupabaseClient {
  return createServiceClient();
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      throw new TableFlowError('VALIDATION_ERROR', 'Invalid request body', 422);
    }
    throw new TableFlowError('VALIDATION_ERROR', 'Invalid JSON body', 422);
  }
}

export async function getOperatorUser(req: NextRequest) {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) throwError('UNAUTHORIZED', 'Missing authorization token');

  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throwError('UNAUTHORIZED', 'Invalid token');
  return user;
}

export async function getSessionAuth(req: NextRequest): Promise<SessionTokenPayload> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) throwError('UNAUTHORIZED', 'Missing session token');

  let payload: SessionTokenPayload;
  try {
    payload = await verifySessionToken(token);
  } catch {
    throwError('SESSION_EXPIRED', 'Session token expired or invalid');
  }

  // S10: closed table_sessions revoke guest JWTs immediately (no jti denylist).
  const supabase = getSupabase();
  const { data: session, error } = await supabase
    .from('table_sessions')
    .select('status')
    .eq('id', payload.session_id)
    .maybeSingle();

  if (error) {
    console.error('[getSessionAuth] session lookup failed', error);
    throwError('INTERNAL_ERROR', 'Unable to validate session');
  }
  if (!session || session.status === 'closed') {
    throwError('SESSION_EXPIRED', 'Session is closed');
  }

  return payload;
}

export async function getStaffOrOperator(req: NextRequest, venueId: string) {
  const user = await getOperatorUser(req);
  const supabase = getSupabase();

  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single();

  if (venue) return { user, role: 'owner' as const, staffId: null as string | null };

  const { data: staff } = await supabase
    .from('staff')
    .select('id, role')
    .eq('venue_id', venueId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) throwError('FORBIDDEN', 'Access denied');
  return { user, role: staff.role as string, staffId: staff.id as string };
}

export async function auditLog(
  venueId: string | null,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = getSupabase();
  await supabase.from('audit_log').insert({
    venue_id: venueId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export function failDb(cause?: unknown): never {
  console.error(cause);
  throw new TableFlowError('INTERNAL_ERROR', 'Internal server error', 500);
}

export function handleApiError(err: unknown): Response {
  if (err instanceof TableFlowError) return errorResponse(err);
  console.error(err);
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : String(err);
  return errorResponse(new TableFlowError('INTERNAL_ERROR', message, 500));
}

export async function withHandler(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    return handleApiError(err);
  }
}

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
  }
  return stripeClient;
}

export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) throwError('VENUE_NOT_ONBOARDED', 'Payments are not configured for this venue');
  return stripe;
}

export async function getOwnerVenueBilling(userId: string) {
  const supabase = getSupabase();
  const { data: venue } = await supabase
    .from('venues')
    .select('id, plan, trial_ends_at, subscription_status, stripe_customer_id')
    .eq('owner_id', userId)
    .single();
  return venue;
}
