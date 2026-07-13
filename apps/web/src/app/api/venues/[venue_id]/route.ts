import { NextRequest } from 'next/server';
import { UpdateVenueSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { requireActiveSubscription, type VenuePlan } from '@/lib/billing';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('venues')
      .select('id, name, slug, owner_id, brand_color, tab_mode, qr_mode, nfc_enabled, currency, stripe_account_id, stripe_onboarded, plan, trial_ends_at, subscription_status, stripe_customer_id, address, city, timezone, created_at')
      .eq('id', params.venue_id)
      .single();

    if (error || !data) throwError('NOT_FOUND', 'Venue not found');
    return Response.json(data);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    const { user } = await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, UpdateVenueSchema);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('plan, trial_ends_at, subscription_status, stripe_customer_id, stripe_subscription_id, owner_id')
      .eq('id', params.venue_id)
      .single();

    // Soft paywall: owners lose write access after trial; settings/billing routes remain separate
    if (venue?.owner_id === user.id) {
      requireActiveSubscription({
        plan: (venue.plan ?? 'starter') as VenuePlan,
        trial_ends_at: venue.trial_ends_at,
        subscription_status: venue.subscription_status,
        stripe_customer_id: venue.stripe_customer_id,
        stripe_subscription_id: venue.stripe_subscription_id,
      });
    }

    const { data, error } = await supabase
      .from('venues')
      .update(body)
      .eq('id', params.venue_id)
      .select()
      .single();

    if (error) failDb(error);
    await auditLog(params.venue_id, null, 'venue.updated', 'venue', params.venue_id);
    return Response.json(data);
  });
}
