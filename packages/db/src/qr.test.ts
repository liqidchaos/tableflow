import { describe, it, expect } from 'vitest';
import { generateStaticQRPayload, parseStaticQRPayload, formatDynamicQRPayload, parseDynamicQRPayload } from '../src/qr';

describe('QR utilities', () => {
  it('generates consistent static QR payload', () => {
    const tableId = '88888888-8888-4888-8888-888888888881';
    const venueId = '11111111-1111-4111-8111-111111111111';
    const payload = generateStaticQRPayload(tableId, venueId);
    expect(payload).toMatch(/^tf_t_/);
    expect(parseStaticQRPayload(payload)?.tableIdPrefix).toBe(tableId.slice(0, 8));
  });

  it('formats and parses dynamic QR payload', () => {
    const token = 'abc123';
    const payload = formatDynamicQRPayload(token);
    expect(payload).toBe('tf_d_abc123');
    expect(parseDynamicQRPayload(payload)).toBe('abc123');
    expect(parseDynamicQRPayload('tf_t_static')).toBeNull();
  });
});
