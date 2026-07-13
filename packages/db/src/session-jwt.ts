import { SignJWT, jwtVerify } from 'jose';

export interface SessionTokenPayload {
  session_id: string;
  venue_id: string;
  table_id: string;
  guest_id: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) throw new Error('SESSION_JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

/** Guest session JWT TTL — shortened from 12h (TAB-23 / S10); closed sessions also reject at verify. */
export const SESSION_JWT_TTL = '4h';

export async function generateSessionToken(
  payload: SessionTokenPayload,
  expiresIn = SESSION_JWT_TTL
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    session_id: payload.session_id as string,
    venue_id: payload.venue_id as string,
    table_id: payload.table_id as string,
    guest_id: payload.guest_id as string,
  };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
