import { NextRequest } from 'next/server';
import { RegisterSchema } from '@tableflow/types';
import { generateStaticQRPayload, seedVenueIfEmpty } from '@tableflow/db';
import {
  getSupabase,
  parseBody,
  withHandler,
  requireStripe,
  auditLog,
} from '@/lib/api';
import { scheduleLifecycleEmails } from '@/lib/email';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { platformChargesEnabled } from '@/lib/stripe-venue';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'auth/register'), 5);
    const body = await parseBody(req, RegisterSchema);
    const supabase = getSupabase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message ?? 'Failed to create user');
    }

    const slug = `${slugify(body.venue_name)}-${authData.user.id.slice(0, 8)}`;
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    let stripeCustomerId: string | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = requireStripe();
        const customer = await stripe.customers.create({
          email: body.email,
          name: body.full_name,
          metadata: { owner_id: authData.user.id, venue_name: body.venue_name },
        });
        stripeCustomerId = customer.id;
      } catch (e) {
        console.warn('Stripe customer creation skipped:', e);
      }
    }

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: body.venue_name,
        slug,
        owner_id: authData.user.id,
        plan: 'starter',
        trial_ends_at: trialEndsAt,
        stripe_customer_id: stripeCustomerId,
        subscription_status: 'trialing',
      })
      .select()
      .single();

    if (venueError || !venue) throw new Error(venueError?.message ?? 'Failed to create venue');

    if (stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = requireStripe();
        await stripe.customers.update(stripeCustomerId, {
          metadata: {
            venue_id: venue.id,
            owner_id: authData.user.id,
            venue_name: body.venue_name,
          },
        });
      } catch (e) {
        console.warn('Stripe customer metadata update skipped:', e);
      }
    }

    for (let i = 1; i <= 4; i++) {
      const { data: table } = await supabase
        .from('venue_tables')
        .insert({
          venue_id: venue.id,
          name: `Table ${i}`,
          capacity: 4,
        })
        .select()
        .single();
      if (table) {
        const qrCode = generateStaticQRPayload(table.id, venue.id);
        await supabase.from('venue_tables').update({ qr_code: qrCode }).eq('id', table.id);
      }
    }

    let stripeOnboardingUrl: string | null = null;
    // Staging: charge the platform account so operators can go live without Connect signup.
    // Production: create Express accounts and send operators through Connect onboarding.
    if (process.env.STRIPE_SECRET_KEY && platformChargesEnabled()) {
      const { error: platformOnboardError } = await supabase
        .from('venues')
        .update({ stripe_onboarded: true, stripe_account_id: null })
        .eq('id', venue.id);
      if (platformOnboardError) {
        console.warn('Platform-charges onboarding flag skipped:', platformOnboardError);
      }
    } else if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = requireStripe();
        const account = await stripe.accounts.create({
          type: 'express',
          email: body.email,
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        });
        await supabase.from('venues').update({ stripe_account_id: account.id }).eq('id', venue.id);
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${appUrl}/onboarding/stripe/refresh`,
          return_url: `${appUrl}/onboarding/stripe/complete`,
          type: 'account_onboarding',
        });
        stripeOnboardingUrl = accountLink.url;
      } catch (e) {
        console.warn('Stripe onboarding skipped:', e);
      }
    }

    const { data: session } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    await auditLog(venue.id, authData.user.id, 'venue.created', 'venue', venue.id);
    await auditLog(venue.id, authData.user.id, 'activation.registered', 'venue', venue.id);

    await seedVenueIfEmpty(supabase, venue.id);

    void scheduleLifecycleEmails({
      to: body.email,
      venueName: body.venue_name,
      ownerName: body.full_name,
      venueId: venue.id,
      actorId: authData.user.id,
    });

    return Response.json(
      {
        user_id: authData.user.id,
        venue_id: venue.id,
        venue_name: venue.name,
        access_token: session?.session?.access_token,
        stripe_onboarding_url: stripeOnboardingUrl,
        trial_ends_at: trialEndsAt,
        plan: 'starter',
        subscription_status: 'trialing',
      },
      { status: 201 }
    );
  });
}
