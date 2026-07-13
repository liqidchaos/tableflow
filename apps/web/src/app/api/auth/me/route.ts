import { NextRequest } from 'next/server';
import { seedVenueIfEmpty } from '@tableflow/db';
import { getSupabase, withHandler, getOperatorUser } from '@/lib/api';
import { hasActiveAccess, trialDaysRemaining, type VenuePlan } from '@/lib/billing';

export async function GET(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const supabase = getSupabase();

    const { data: ownedVenue } = await supabase
      .from('venues')
      .select('id, name, slug, currency, brand_color, plan, trial_ends_at, subscription_status')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (ownedVenue) {
      await seedVenueIfEmpty(supabase, ownedVenue.id);
      const billing = {
        plan: (ownedVenue.plan ?? 'starter') as VenuePlan,
        trial_ends_at: ownedVenue.trial_ends_at,
        subscription_status: ownedVenue.subscription_status,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      };
      return Response.json({
        user_id: user.id,
        email: user.email,
        venue_id: ownedVenue.id,
        venue_name: ownedVenue.name,
        venue: ownedVenue,
        role: 'owner' as const,
        billing: {
          plan: ownedVenue.plan,
          trial_days_remaining: trialDaysRemaining(billing),
          subscription_status: ownedVenue.subscription_status,
          is_active: hasActiveAccess(billing),
        },
      });
    }

    const { data: staffRecord } = await supabase
      .from('staff')
      .select('role, venue_id, venues(id, name, slug, currency, brand_color)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!staffRecord?.venues) {
      return Response.json({ user_id: user.id, email: user.email, venue_id: null, venue_name: null, role: null });
    }

    const venue = staffRecord.venues as unknown as {
      id: string;
      name: string;
      slug: string;
      currency: string;
      brand_color: string;
    };

    return Response.json({
      user_id: user.id,
      email: user.email,
      venue_id: venue.id,
      venue_name: venue.name,
      venue,
      role: staffRecord.role,
    });
  });
}
