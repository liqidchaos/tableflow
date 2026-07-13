import { NextRequest } from 'next/server';
import { generateStaticQRPayload, generateQRImageURL } from '@tableflow/db';
import { getSupabase, withHandler, getStaffOrOperator } from '@/lib/api';

export async function POST(
  req: NextRequest,
  { params }: { params: { venue_id: string; table_id: string } }
) {
  return withHandler(async () => {
    await getStaffOrOperator(req, params.venue_id);
    const supabase = getSupabase();

    const qrCode = generateStaticQRPayload(params.table_id, params.venue_id);
    const { error } = await supabase
      .from('venue_tables')
      .update({ qr_code: qrCode })
      .eq('id', params.table_id)
      .eq('venue_id', params.venue_id);

    if (error) throw new Error(error.message);

    return Response.json({
      qr_code: qrCode,
      qr_image_url: generateQRImageURL(qrCode),
    });
  });
}
