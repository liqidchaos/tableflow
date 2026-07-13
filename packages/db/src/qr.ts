import { createHash, randomBytes } from 'crypto';

export function generateStaticQRPayload(tableId: string, venueId: string): string {
  const hash = createHash('sha256')
    .update(`${tableId}:${venueId}`)
    .digest('hex')
    .slice(0, 8);
  return `tf_t_${tableId.slice(0, 8)}_${hash}`;
}

export function generateQRImageURL(payload: string, baseUrl?: string): string {
  const appUrl = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${appUrl}/api/qr/${encodeURIComponent(payload)}.png`;
}

export function parseStaticQRPayload(payload: string): { tableIdPrefix: string } | null {
  const match = payload.match(/^tf_t_([a-f0-9-]{8})_[a-f0-9]{8}$/i);
  if (!match) return null;
  return { tableIdPrefix: match[1] };
}

export const DYNAMIC_QR_PREFIX = 'tf_d_';

export function generateDynamicQRToken(): string {
  return randomBytes(16).toString('hex');
}

export function formatDynamicQRPayload(token: string): string {
  return `${DYNAMIC_QR_PREFIX}${token}`;
}

export function parseDynamicQRPayload(payload: string): string | null {
  if (!payload.startsWith(DYNAMIC_QR_PREFIX)) return null;
  const token = payload.slice(DYNAMIC_QR_PREFIX.length);
  return token.length > 0 ? token : null;
}
