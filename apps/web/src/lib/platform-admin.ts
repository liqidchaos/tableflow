import { NextRequest } from 'next/server';
import { throwError } from '@tableflow/types';
import { getOperatorUser } from './api';

export type PlatformAdminPrincipal = {
  userId: string;
};

/**
 * Platform-admin is granted via Auth Admin `app_metadata.platform_admin` (service role only).
 * Never read `user_metadata` — that claim is user-editable.
 */
export function isPlatformAdminUser(user: {
  app_metadata?: Record<string, unknown> | null;
}): boolean {
  return user.app_metadata?.platform_admin === true;
}

/**
 * Guards platform-internal actions (e.g. creating one-off venue invoices).
 * Requires a Supabase Auth bearer session with scoped `app_metadata.platform_admin`.
 */
export async function requirePlatformAdmin(
  req: NextRequest
): Promise<PlatformAdminPrincipal> {
  const user = await getOperatorUser(req);
  if (!isPlatformAdminUser(user)) {
    throwError('FORBIDDEN', 'Platform admin access required');
  }
  return { userId: user.id };
}
