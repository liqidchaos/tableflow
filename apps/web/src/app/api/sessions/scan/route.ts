import { NextRequest } from 'next/server';
import { ScanSessionSchema } from '@tableflow/types';
import { generateSessionToken, parseDynamicQRPayload } from '@tableflow/db';
import { getSupabase, parseBody, withHandler, failDb } from '@/lib/api';
import { throwError } from '@tableflow/types';

const TABLE_COLUMNS = 'id, venue_id, name, qr_code, nfc_uid, is_active';
const VENUE_COLUMNS = 'id, name, tab_mode, currency, brand_color';
const SESSION_COLUMNS = 'id, venue_id, table_id, status, tab_mode';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const body = await parseBody(req, ScanSessionSchema);
    const supabase = getSupabase();

    let query = supabase
      .from('venue_tables')
      .select(`${TABLE_COLUMNS}, venues(${VENUE_COLUMNS})`)
      .eq('is_active', true);

    if (body.qr_code) {
      const dynamicToken = parseDynamicQRPayload(body.qr_code);
      if (dynamicToken) {
        const { data: qrToken } = await supabase
          .from('dynamic_qr_tokens')
          .select('table_id, expires_at')
          .eq('token', dynamicToken)
          .maybeSingle();

        if (!qrToken || new Date(qrToken.expires_at) < new Date()) {
          throwError('NOT_FOUND', 'QR code expired or invalid');
        }

        await supabase
          .from('dynamic_qr_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', dynamicToken);

        query = query.eq('id', qrToken.table_id);
      } else {
        query = query.eq('qr_code', body.qr_code);
      }
    } else if (body.nfc_uid) {
      query = query.eq('nfc_uid', body.nfc_uid);
    }

    const { data: table, error } = await query.single();
    if (error || !table) throwError('NOT_FOUND', 'Invalid QR code or NFC tag');

    const venue = table.venues as unknown as { id: string; name: string; tab_mode: string; currency: string; brand_color: string };

    let session;
    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select(SESSION_COLUMNS)
      .eq('table_id', table.id)
      .eq('status', 'open')
      .maybeSingle();

    if (existingSession) {
      session = existingSession;
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('table_sessions')
        .insert({
          venue_id: table.venue_id,
          table_id: table.id,
          tab_mode: venue.tab_mode,
        })
        .select(SESSION_COLUMNS)
        .single();
      if (sessionError || !newSession) failDb(sessionError);
      session = newSession;
    }

    const { data: guest, error: guestError } = await supabase
      .from('session_guests')
      .insert({
        session_id: session.id,
        display_name: 'Guest 1',
      })
      .select('id')
      .single();

    if (guestError || !guest) failDb(guestError);

    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id);

    const sessionToken = await generateSessionToken({
      session_id: session.id,
      venue_id: table.venue_id,
      table_id: table.id,
      guest_id: guest.id,
    });

    return Response.json({
      session_id: session.id,
      session_token: sessionToken,
      venue_id: table.venue_id,
      table_id: table.id,
      table_name: table.name,
      venue_name: venue.name,
      tab_mode: venue.tab_mode,
      currency: venue.currency,
      brand_color: venue.brand_color,
      existing_order_count: count ?? 0,
      guest_id: guest.id,
    });
  });
}
