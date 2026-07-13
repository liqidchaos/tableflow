import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TableFlowError } from '@tableflow/types';
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitKey,
  trustForwardedClientIp,
  _resetRateLimitBucketsForTests,
} from './rate-limit';

describe('clientIpFromRequest / trustForwardedClientIp', () => {
  const prev = {
    TRUST_PROXY: process.env.TRUST_PROXY,
    VERCEL: process.env.VERCEL,
  };

  afterEach(() => {
    if (prev.TRUST_PROXY === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = prev.TRUST_PROXY;
    if (prev.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prev.VERCEL;
  });

  it('ignores X-Forwarded-For when proxy is not trusted', () => {
    process.env.TRUST_PROXY = '0';
    delete process.env.VERCEL;
    expect(trustForwardedClientIp()).toBe(false);
    const req = new Request('http://localhost/api', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(clientIpFromRequest(req)).toBe('unknown');
    expect(rateLimitKey(req, 'auth/login')).toBe('auth/login:unknown');
  });

  it('uses first X-Forwarded-For hop when TRUST_PROXY=1', () => {
    process.env.TRUST_PROXY = '1';
    const req = new Request('http://localhost/api', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(clientIpFromRequest(req)).toBe('203.0.113.9');
  });

  it('trusts forwarded headers on Vercel by default', () => {
    delete process.env.TRUST_PROXY;
    process.env.VERCEL = '1';
    expect(trustForwardedClientIp()).toBe(true);
  });
});

describe('checkRateLimit (memory backend)', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_BACKEND = 'memory';
    _resetRateLimitBucketsForTests();
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_BACKEND;
  });

  it('allows requests under the limit', async () => {
    await expect(checkRateLimit('test:a', 3)).resolves.toBeUndefined();
    await expect(checkRateLimit('test:a', 3)).resolves.toBeUndefined();
    await expect(checkRateLimit('test:a', 3)).resolves.toBeUndefined();
  });

  it('throws RATE_LIMITED when exceeded', async () => {
    await checkRateLimit('test:b', 2);
    await checkRateLimit('test:b', 2);
    try {
      await checkRateLimit('test:b', 2);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TableFlowError);
      expect((e as TableFlowError).code).toBe('RATE_LIMITED');
    }
  });
});
