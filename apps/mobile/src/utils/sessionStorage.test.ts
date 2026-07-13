import { describe, it, expect } from 'vitest';
import { isSessionValid, parseStoredSession } from './sessionStorage';

describe('parseStoredSession', () => {
  it('returns null for invalid JSON', () => {
    expect(parseStoredSession('not-json')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseStoredSession(JSON.stringify({ sessionId: 'abc' }))).toBeNull();
  });

  it('merges stored values with defaults', () => {
    const parsed = parseStoredSession(
      JSON.stringify({
        sessionId: 'sess-1',
        sessionToken: 'token-1',
        venueId: 'venue-1',
        tipPercent: 0.15,
      })
    );
    expect(parsed?.tipPercent).toBe(0.15);
    expect(parsed?.currency).toBe('usd');
    expect(parsed?.paymentIntentId).toBeNull();
  });
});

describe('isSessionValid', () => {
  it('requires session, token, and venue', () => {
    expect(
      isSessionValid({
        sessionId: 's',
        sessionToken: 't',
        venueId: 'v',
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
      })
    ).toBe(true);
    expect(isSessionValid(null)).toBe(false);
  });
});
