import { NextRequest } from 'next/server';
import { CreateOrderSchema } from '@tableflow/types';
import type { TabMode } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getSessionAuth, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { getUpsellSuggestions } from '@/lib/ai';
import { buildUpsellContext } from '@/lib/ai-helpers';
import { notifyVenueServers } from '@/lib/push';
import { trackActivationEvent } from '@/lib/activation';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { withIdempotency } from '@/lib/idempotency';
import {
  enqueueOrderToKitchen,
  sessionHasClearedPayment,
  shouldEnqueueOnOrderCreate,
} from '@/lib/kitchen-enqueue';
import { venuePaymentsEnabled } from '@/lib/stripe-venue';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'orders'), 40);
    const supabase = getSupabase();

    return withIdempotency(supabase, req, 'orders', async () => {
      const sessionAuth = await getSessionAuth(req);
      const body = await parseBody(req, CreateOrderSchema);

      if (body.session_id !== sessionAuth.session_id) {
        throwError('FORBIDDEN', 'Session mismatch');
      }

      const { data: session } = await supabase
        .from('table_sessions')
        .select('status, tab_mode')
        .eq('id', body.session_id)
        .single();

      if (!session || session.status !== 'open') {
        throwError('SESSION_EXPIRED', 'This table session has been closed.');
      }

      let subtotal = 0;
      let maxPrepTime = 0;
      const orderItems = [];

      for (const item of body.items) {
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('*, menu_item_modifiers(id, group_name, menu_modifier_options(*))')
          .eq('id', item.item_id)
          .eq('venue_id', sessionAuth.venue_id)
          .eq('is_available', true)
          .is('deleted_at', null)
          .single();

        if (!menuItem) throwError('ITEM_UNAVAILABLE', `Item ${item.item_id} is unavailable`);

        let itemTotal = Number(menuItem.price) * item.quantity;
        const modifierSnapshots = [];

        for (const mod of item.modifiers ?? []) {
          const { data: option } = await supabase
            .from('menu_modifier_options')
            .select('*, menu_item_modifiers!inner(id, group_name)')
            .eq('id', mod.option_id)
            .eq('modifier_id', mod.modifier_id)
            .single();

          if (option) {
            itemTotal += Number(option.price_delta) * item.quantity;
            modifierSnapshots.push({
              modifier_id: mod.modifier_id,
              option_id: mod.option_id,
              name: option.name,
              price_delta: Number(option.price_delta),
            });
          }
        }

        subtotal += itemTotal;
        if (menuItem.prep_time_minutes) {
          maxPrepTime = Math.max(maxPrepTime, menuItem.prep_time_minutes);
        }

        orderItems.push({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: Number(menuItem.price),
          total_price: itemTotal,
          modifiers: modifierSnapshots,
          special_instructions: item.special_instructions,
          course: item.course,
        });
      }

      // Pay-before-fire: never insert as KDS-visible until payment clears.
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          venue_id: sessionAuth.venue_id,
          session_id: body.session_id,
          guest_id: body.guest_id,
          subtotal,
          notes: body.notes,
          status: 'pending_payment',
        })
        .select()
        .single();

      if (orderError || !order) failDb(orderError);

      await supabase.from('order_items').insert(
        orderItems.map((oi) => ({ ...oi, order_id: order.id }))
      );

      await auditLog(sessionAuth.venue_id, null, 'order.created', 'order', order.id, {
        status: 'pending_payment',
      });

      const { data: venue } = await supabase
        .from('venues')
        .select('stripe_account_id, stripe_onboarded')
        .eq('id', sessionAuth.venue_id)
        .single();

      const paymentsEnabled = venuePaymentsEnabled(venue);
      const tabMode = (session.tab_mode ?? 'pay_per_order') as TabMode;
      const cleared = paymentsEnabled
        ? await sessionHasClearedPayment(supabase, body.session_id)
        : false;
      const gate = shouldEnqueueOnOrderCreate({
        tabMode,
        sessionHasClearedPayment: cleared,
        venuePaymentsEnabled: paymentsEnabled,
      });

      let status = order.status as string;
      if (gate.enqueue) {
        const result = await enqueueOrderToKitchen(supabase, order.id);
        if (result.enqueued) {
          status = 'received';
          await auditLog(sessionAuth.venue_id, null, 'kitchen.enqueued', 'order', order.id, {
            reason: gate.reason,
          });
        }
      }

      const { count: priorOrders } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', sessionAuth.venue_id);

      if ((priorOrders ?? 0) <= 1) {
        await trackActivationEvent(sessionAuth.venue_id, null, 'first_order', { order_id: order.id });
      }

      const { data: table } = await supabase
        .from('venue_tables')
        .select('name')
        .eq('id', sessionAuth.table_id)
        .single();

      // Floor staff can know about the order; kitchen only sees paid (received) tickets.
      await notifyVenueServers(supabase, sessionAuth.venue_id, {
        title: status === 'received' ? 'New paid order' : 'Order awaiting payment',
        body:
          status === 'received'
            ? `${table?.name ?? 'A table'} — ticket fired to kitchen`
            : `${table?.name ?? 'A table'} placed an order (payment pending)`,
        data: { order_id: order.id, type: status === 'received' ? 'new_order' : 'order_pending_payment' },
      });

      const cartItemIds = body.items.map((i) => i.item_id);
      const upsellContext = await buildUpsellContext(supabase, sessionAuth.venue_id, cartItemIds);
      const upsell = await getUpsellSuggestions(upsellContext);

      return Response.json(
        {
          order_id: order.id,
          status,
          subtotal,
          estimated_prep_minutes: maxPrepTime || 15,
          upsell_suggestions: upsell.suggestions,
        },
        { status: 201 }
      );
    });
  });
}
