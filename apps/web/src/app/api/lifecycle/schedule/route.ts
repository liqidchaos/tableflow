import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getOperatorUser } from '@/lib/api';
import { scheduleLifecycleEmails } from '@/lib/email';

/** Schedule Day 1/7/30 lifecycle emails (Day 0 is sent on register). */
export async function POST(req: NextRequest) {
  return withHandler(async () => {
    const user = await getOperatorUser(req);
    const supabase = getSupabase();

    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', user.id)
      .single();

    if (!venue) {
      return Response.json({ error: 'No venue' }, { status: 404 });
    }

    const result = await scheduleLifecycleEmails({
      to: user.email!,
      venueName: venue.name,
      ownerName: (user.user_metadata?.full_name as string) || undefined,
      venueId: venue.id,
      actorId: user.id,
    });

    return Response.json(result);
  });
}
