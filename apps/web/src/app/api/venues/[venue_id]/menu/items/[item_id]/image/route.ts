import { NextRequest } from 'next/server';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';

export async function POST(
  req: NextRequest,
  { params }: { params: { venue_id: string; item_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('No file provided');

    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `${params.venue_id}/${params.item_id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: upload, error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(upload.path);

    const { data, error } = await supabase
      .from('menu_items')
      .update({ image_url: publicUrl })
      .eq('id', params.item_id)
      .eq('venue_id', params.venue_id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    return Response.json(data);
  });
}
