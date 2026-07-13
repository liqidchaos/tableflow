import type { TabMode } from '@tableflow/types';

export const SESSION_STORAGE_KEY = 'tableflow_session';

export interface StoredSession {
  sessionId: string | null;
  sessionToken: string | null;
  venueId: string | null;
  tableId: string | null;
  tableName: string | null;
  venueName: string | null;
  guestId: string | null;
  tabMode: TabMode | null;
  currency: string;
  brandColor: string | null;
  activeOrderId: string | null;
  tipPercent: number;
  paymentIntentId: string | null;
  cardSaved: boolean;
}

export const EMPTY_SESSION: StoredSession = {
  sessionId: null,
  sessionToken: null,
  venueId: null,
  tableId: null,
  tableName: null,
  venueName: null,
  guestId: null,
  tabMode: null,
  currency: 'usd',
  brandColor: null,
  activeOrderId: null,
  tipPercent: 0.2,
  paymentIntentId: null,
  cardSaved: false,
};

export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.sessionId || !parsed.sessionToken) return null;
    return { ...EMPTY_SESSION, ...parsed };
  } catch {
    return null;
  }
}

export function isSessionValid(session: StoredSession | null): boolean {
  return Boolean(session?.sessionId && session?.sessionToken && session?.venueId);
}
