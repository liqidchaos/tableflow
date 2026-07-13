import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';
import { platformChargesEnabled, venuePaymentsEnabled } from '@/lib/stripe-venue';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const [
      { data: venue },
      { data: tables },
      { count: menuCount },
      { count: orderCount },
    ] = await Promise.all([
      supabase
        .from('venues')
        .select('stripe_onboarded, stripe_account_id, plan, subscription_status, trial_ends_at')
        .eq('id', params.venue_id)
        .single(),
      supabase
        .from('venue_tables')
        .select('id, qr_code')
        .eq('venue_id', params.venue_id),
      supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', params.venue_id)
        .is('deleted_at', null),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', params.venue_id),
    ]);

    const tableList = tables ?? [];
    const tablesWithQr = tableList.filter((t) => Boolean(t.qr_code)).length;
    const paymentsReady = venuePaymentsEnabled(venue);
    const pricingReady = Boolean(
      venue?.plan && (venue.subscription_status === 'trialing' || venue.subscription_status === 'active')
    );

    const steps = [
      {
        id: 'stripe',
        label: platformChargesEnabled()
          ? 'Payments ready (platform charges)'
          : 'Connect Stripe',
        done: paymentsReady,
        href: '/settings',
      },
      {
        id: 'tables',
        label: 'Set up tables & print QRs',
        done: tablesWithQr > 0,
        href: '/tables',
      },
      {
        id: 'menu',
        label: 'Review your menu',
        done: (menuCount ?? 0) > 0,
        href: '/menu',
      },
      {
        id: 'pricing',
        label: 'Confirm flat pricing / trial',
        done: pricingReady,
        href: '/settings',
      },
      {
        id: 'test_order',
        label: 'Place a test order',
        done: (orderCount ?? 0) > 0,
        href: '/tables',
      },
    ];

    const completed = steps.filter((s) => s.done).length;

    return Response.json({
      steps,
      completed,
      total: steps.length,
      is_complete: completed === steps.length,
      meta: {
        table_count: tableList.length,
        tables_with_qr: tablesWithQr,
        menu_items: menuCount ?? 0,
        orders: orderCount ?? 0,
        platform_charges: platformChargesEnabled(),
        plan: venue?.plan ?? null,
        subscription_status: venue?.subscription_status ?? null,
        trial_ends_at: venue?.trial_ends_at ?? null,
      },
    });
  });
}
