import { NextRequest } from 'next/server';
import { CreateStaffSchema } from '@tableflow/types';
import { getSupabase, parseBody, withHandler, getStaffOrOperator } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('staff')
      .select('id, venue_id, user_id, role, display_name, is_active, created_at')
      .eq('venue_id', params.venue_id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return Response.json({ staff: data ?? [] });
  });
}

export async function POST(req: NextRequest, { params }: { params: { venue_id: string } }) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const body = await parseBody(req, CreateStaffSchema);
    const supabase = getSupabase();

    const { data: listData } = await supabase.auth.admin.listUsers();
    let staffUserId = listData?.users?.find((u) => u.email === body.email)?.id;

    if (!staffUserId) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        password: crypto.randomUUID(),
        user_metadata: { full_name: body.display_name },
      });
      if (createError || !newUser.user) throw new Error(createError?.message ?? 'Failed to create user');
      staffUserId = newUser.user.id;
    }

    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('venue_id', params.venue_id)
      .eq('user_id', staffUserId)
      .maybeSingle();
    if (existing) throw new Error('Staff member already exists for this venue');

    const { data, error } = await supabase
      .from('staff')
      .insert({
        venue_id: params.venue_id,
        user_id: staffUserId,
        role: body.role,
        display_name: body.display_name,
      })
      .select('id, venue_id, user_id, role, display_name, is_active, created_at')
      .single();
    if (error) throw new Error(error.message);

    return Response.json(data, { status: 201 });
  });
}
