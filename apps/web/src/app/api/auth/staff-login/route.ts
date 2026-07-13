import { NextRequest } from 'next/server';
import { StaffLoginSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'auth/staff-login'), 10);
    const body = await parseBody(req, StaffLoginSchema);
    const supabase = getSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session) {
      throwError('UNAUTHORIZED', 'Invalid email or password');
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('id, venue_id, role, display_name, venues(name)')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!staff) {
      throwError('FORBIDDEN', 'No active staff account found for this user');
    }

    const venue = staff.venues as unknown as { name: string } | null;

    return Response.json({
      access_token: data.session.access_token,
      user_id: data.user.id,
      staff_id: staff.id,
      venue_id: staff.venue_id,
      venue_name: venue?.name ?? null,
      role: staff.role,
      display_name: staff.display_name,
    });
  });
}
