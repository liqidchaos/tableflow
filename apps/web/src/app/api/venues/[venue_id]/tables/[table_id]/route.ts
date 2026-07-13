import { NextRequest } from 'next/server';
import { UpdateTableSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { venue_id: string; table_id: string } }
) {
  return withHandler(async () => {
    const { user } = await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, UpdateTableSchema);
    const supabase = getSupabase();

    if (body.assigned_staff_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, role, is_active')
        .eq('id', body.assigned_staff_id)
        .eq('venue_id', params.venue_id)
        .maybeSingle();

      if (!staff || !staff.is_active) {
        throwError('VALIDATION_ERROR', 'Assigned staff must be an active member of this venue');
      }
      if (!['server', 'manager'].includes(staff.role)) {
        throwError('VALIDATION_ERROR', 'Only servers or managers can be assigned to tables');
      }
    }

    const { data, error } = await supabase
      .from('venue_tables')
      .update(body)
      .eq('id', params.table_id)
      .eq('venue_id', params.venue_id)
      .select(
        'id, venue_id, name, capacity, qr_code, nfc_uid, is_active, position_x, position_y, assigned_staff_id, created_at'
      )
      .single();

    if (error) failDb(error);
    if (!data) throwError('NOT_FOUND', 'Table not found');

    await auditLog(params.venue_id, user.id, 'table.updated', 'venue_table', params.table_id, body);
    return Response.json(data);
  });
}
