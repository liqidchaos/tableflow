import { NextRequest } from 'next/server';
import { CreateTableSchema } from '@tableflow/types';
import { generateStaticQRPayload } from '@tableflow/db';
import { getSupabase, parseBody, withHandler, getStaffOrOperator, auditLog, failDb } from '@/lib/api';
import { assertStarterTableCap, requireActiveSubscription, type VenuePlan } from '@/lib/billing';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data: tables } = await supabase
      .from('venue_tables')
      .select(
        'id, venue_id, name, capacity, qr_code, nfc_uid, is_active, position_x, position_y, assigned_staff_id, created_at'
      )
      .eq('venue_id', params.venue_id)
      .order('name');

    const tablesWithSessions = await Promise.all(
      (tables ?? []).map(async (table) => {
        const { data: session } = await supabase
          .from('table_sessions')
          .select('id')
          .eq('table_id', table.id)
          .eq('status', 'open')
          .maybeSingle();
        return { ...table, active_session_id: session?.id ?? null };
      })
    );

    return Response.json({ tables: tablesWithSessions });
  });
}

export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    const { user } = await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, CreateTableSchema);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('plan, trial_ends_at, subscription_status, owner_id')
      .eq('id', params.venue_id)
      .single();

    if (venue?.owner_id === user.id) {
      requireActiveSubscription({
        plan: (venue.plan ?? 'starter') as VenuePlan,
        trial_ends_at: venue.trial_ends_at,
        subscription_status: venue.subscription_status,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      });
    }

    const plan = (venue?.plan ?? 'starter') as VenuePlan;
    const { count } = await supabase
      .from('venue_tables')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', params.venue_id);
    assertStarterTableCap(plan, count ?? 0);

    const { data: table, error } = await supabase
      .from('venue_tables')
      .insert({ ...body, venue_id: params.venue_id })
      .select()
      .single();

    if (error) failDb(error);

    const qrCode = generateStaticQRPayload(table.id, params.venue_id);
    const { data: updated, error: updateError } = await supabase
      .from('venue_tables')
      .update({ qr_code: qrCode })
      .eq('id', table.id)
      .select(
        'id, venue_id, name, capacity, qr_code, nfc_uid, is_active, position_x, position_y, assigned_staff_id, created_at'
      )
      .single();

    if (updateError) failDb(updateError);
    await auditLog(params.venue_id, null, 'table.created', 'venue_table', table.id);

    return Response.json(updated, { status: 201 });
  });
}
