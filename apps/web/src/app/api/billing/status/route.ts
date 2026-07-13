import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getOperatorUser } from '@/lib/api';
import { throwError } from '@tableflow/types';
import {
  hasActiveAccess,
  isInTrial,
  trialDaysRemaining,
  PLAN_PRICES,
  type VenuePlan,
} from '@/lib/billing';

export async function GET(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('id, plan, trial_ends_at, subscription_status, stripe_customer_id, stripe_subscription_id')
      .eq('owner_id', user.id)
      .single();

    if (!venue) throwError('NOT_FOUND', 'Venue not found');

    const plan = (venue.plan ?? 'starter') as VenuePlan;
    const billing = {
      plan,
      trial_ends_at: venue.trial_ends_at,
      subscription_status: venue.subscription_status,
      stripe_customer_id: venue.stripe_customer_id,
      stripe_subscription_id: venue.stripe_subscription_id,
    };

    return Response.json({
      plan,
      plan_price: PLAN_PRICES[plan] ?? 99,
      trial_ends_at: venue.trial_ends_at,
      trial_days_remaining: trialDaysRemaining(billing),
      subscription_status: venue.subscription_status,
      is_active: hasActiveAccess(billing),
      in_trial: isInTrial(billing),
      needs_subscription: !hasActiveAccess(billing),
    });
  });
}
