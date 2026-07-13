import { NextRequest } from 'next/server';
import { generateDynamicQRToken, formatDynamicQRPayload } from '@tableflow/db';
import { getSupabase, withHandler, getStaffOrOperator, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';

const DYNAMIC_QR_TTL_HOURS = 4;

export async function POST(req: NextRequest, { params }: { params: { venue_id: string; table_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('qr_mode')
      .eq('id', params.venue_id)
      .single();

    if (!venue) throwError('NOT_FOUND', 'Venue not found');
    if (venue.qr_mode !== 'dynamic') {
      throwError('VALIDATION_ERROR', 'Venue is not in dynamic QR mode');
    }

    const { data: table } = await supabase
      .from('venue_tables')
      .select('id, name')
      .eq('id', params.table_id)
      .eq('venue_id', params.venue_id)
      .single();

    if (!table) throwError('NOT_FOUND', 'Table not found');

    const token = generateDynamicQRToken();
    const expiresAt = new Date(Date.now() + DYNAMIC_QR_TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('dynamic_qr_tokens').insert({
      venue_id: params.venue_id,
      table_id: params.table_id,
      token,
      expires_at: expiresAt,
    });

    if (error) failDb(error);

    const qrCode = formatDynamicQRPayload(token);

    return Response.json({
      qr_code: qrCode,
      expires_at: expiresAt,
      table_name: table.name,
      guest_url: `/g/${encodeURIComponent(qrCode)}`,
    });
  });
}
