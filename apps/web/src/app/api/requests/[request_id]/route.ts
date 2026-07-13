import { NextRequest } from 'next/server';
import { UpdateRequestSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator, auditLog, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';

export async function PATCH(req: NextRequest, { params }: { params: { request_id: string } }) {
  return withHandler(async () => {
    const body = await parseBody(req, UpdateRequestSchema);
    const supabase = getSupabase();

    const { data: request } = await supabase
      .from('item_requests')
      .select('venue_id')
      .eq('id', params.request_id)
      .single();

    if (!request) throwError('NOT_FOUND', 'Request not found');
    await getStaffOrOperator(req, request.venue_id);

    const updates: Record<string, unknown> = { status: body.status };
    if (body.status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
    if (body.status === 'fulfilled') updates.fulfilled_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('item_requests')
      .update(updates)
      .eq('id', params.request_id)
      .select()
      .single();

    if (error) failDb(error);
    await auditLog(request.venue_id, null, 'request.updated', 'item_request', params.request_id, { status: body.status });
    return Response.json(data);
  });
}
