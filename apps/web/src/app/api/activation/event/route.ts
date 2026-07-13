import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabase, withHandler, getOperatorUser, parseBody } from '@/lib/api';
import { trackActivationEvent, type ActivationEvent } from '@/lib/activation';

const BodySchema = z.object({
  event: z.enum(['stripe_connected', 'first_order', 'subscribed']),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const body = await parseBody(req, BodySchema);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!venue) {
      return Response.json({ error: 'No venue' }, { status: 404 });
    }

    await trackActivationEvent(venue.id, user.id, body.event as ActivationEvent, body.metadata ?? {});

    return Response.json({ ok: true });
  });
}
