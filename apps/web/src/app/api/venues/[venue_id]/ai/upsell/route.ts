import { NextRequest } from 'next/server';
import { UpsellRequestSchema, throwError } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getSessionAuth } from '@/lib/api';
import { getUpsellSuggestions } from '@/lib/ai';
import { buildUpsellContext } from '@/lib/ai-helpers';

export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    const sessionAuth = await getSessionAuth(req);
    if (sessionAuth.venue_id !== params.venue_id) {
      throwError('FORBIDDEN', 'Venue mismatch');
    }

    const body = await parseBody(req, UpsellRequestSchema);
    const supabase = getSupabase();

    const context = await buildUpsellContext(
      supabase,
      params.venue_id,
      body.current_items,
      body.session_context
    );

    const result = await getUpsellSuggestions(context);
    return Response.json(result);
  });
}
