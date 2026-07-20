import { NextRequest } from 'next/server';
import { CreateVenueInvoiceSchema, throwError } from '@tableflow/types';
import {
  getSupabase,
  parseBody,
  withHandler,
  getStaffOrOperator,
  requireStripe,
  auditLog,
  failDb,
} from '@/lib/api';
import { requirePlatformAdmin } from '@/lib/platform-admin';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { createVenueInvoice } from '@/lib/invoicing';

/** Venue owners/staff view their own invoices (paid via the Stripe-hosted invoice page). */
export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('venue_invoices')
      .select('*')
      .eq('venue_id', params.venue_id)
      .order('created_at', { ascending: false });

    if (error) failDb(error);
    return Response.json({ invoices: data ?? [] });
  });
}

/**
 * Creates a one-off invoice against the venue's Stripe Customer.
 * Platform-admins only (`app_metadata.platform_admin`) — not a venue-facing action.
 */
export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'venues/invoices'), 10);
    const admin = await requirePlatformAdmin(req);
    const body = await parseBody(req, CreateVenueInvoiceSchema);
    const supabase = getSupabase();
    const stripe = requireStripe();

    const { data: venue } = await supabase
      .from('venues')
      .select('id, name, owner_id, stripe_customer_id')
      .eq('id', params.venue_id)
      .single();

    if (!venue) throwError('NOT_FOUND', 'Venue not found');

    const { data: owner } = await supabase.auth.admin.getUserById(venue.owner_id);

    const invoice = await createVenueInvoice(
      stripe,
      supabase,
      venue,
      body,
      owner?.user?.email ?? null
    );

    await auditLog(venue.id, admin.userId, 'invoice.created', 'venue_invoice', invoice.id, {
      amount: body.amount,
      description: body.description,
      actor_role: 'platform_admin',
    });

    return Response.json({ invoice }, { status: 201 });
  });
}
