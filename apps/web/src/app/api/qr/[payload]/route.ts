import QRCode from 'qrcode';

export async function GET(_req: Request, { params }: { params: { payload: string } }) {
  const payload = decodeURIComponent(params.payload.replace(/\.png$/, ''));
  const png = await QRCode.toBuffer(payload, { width: 300, margin: 2 });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  });
}
