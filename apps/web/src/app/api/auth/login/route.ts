import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabase, parseBody, withHandler } from '@/lib/api';
import { throwError } from '@tableflow/types';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  return withHandler(async () => {
    await checkRateLimit(rateLimitKey(req, 'auth/login'), 10);
    const body = await parseBody(req, LoginSchema);
    const supabase = getSupabase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session) {
      throwError('UNAUTHORIZED', 'Invalid email or password');
    }

    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', data.user.id)
      .single();

    return Response.json({
      access_token: data.session.access_token,
      user_id: data.user.id,
      venue_id: venue?.id,
      venue_name: venue?.name,
    });
  });
}
