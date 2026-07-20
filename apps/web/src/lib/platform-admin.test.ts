import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TableFlowError } from '@tableflow/types';

const getOperatorUser = vi.hoisted(() => vi.fn());

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    getOperatorUser: (...args: unknown[]) => getOperatorUser(...args),
  };
});

import { isPlatformAdminUser, requirePlatformAdmin } from './platform-admin';
import { safeEqualSecrets } from './api';

describe('safeEqualSecrets', () => {
  it('returns true for equal secrets', () => {
    expect(safeEqualSecrets('platform-admin-secret', 'platform-admin-secret')).toBe(true);
  });

  it('returns false for unequal secrets of equal length', () => {
    expect(safeEqualSecrets('aaaaaaaa', 'bbbbbbbb')).toBe(false);
  });

  it('returns false for unequal lengths without throwing', () => {
    expect(safeEqualSecrets('short', 'much-longer-secret')).toBe(false);
  });
});

describe('isPlatformAdminUser', () => {
  it('requires app_metadata.platform_admin === true', () => {
    expect(isPlatformAdminUser({ app_metadata: { platform_admin: true } })).toBe(true);
    expect(isPlatformAdminUser({ app_metadata: { platform_admin: false } })).toBe(false);
    expect(isPlatformAdminUser({ app_metadata: { platform_admin: 'true' } })).toBe(false);
    expect(isPlatformAdminUser({ app_metadata: {} })).toBe(false);
    expect(isPlatformAdminUser({ app_metadata: null })).toBe(false);
    expect(isPlatformAdminUser({})).toBe(false);
  });

  it('does not treat loose role aliases as admin', () => {
    expect(
      isPlatformAdminUser({
        app_metadata: { role: 'platform_admin', is_admin: true },
      })
    ).toBe(false);
  });
});

describe('requirePlatformAdmin', () => {
  beforeEach(() => {
    getOperatorUser.mockReset();
  });

  it('rejects missing/invalid session (UNAUTHORIZED from getOperatorUser)', async () => {
    getOperatorUser.mockRejectedValue(
      new TableFlowError('UNAUTHORIZED', 'Missing authorization token', 401)
    );
    const req = new NextRequest('http://localhost/api/venues/v1/invoices', { method: 'POST' });
    await expect(requirePlatformAdmin(req)).rejects.toThrow(TableFlowError);
  });

  it('rejects authenticated users without platform_admin (FORBIDDEN)', async () => {
    getOperatorUser.mockResolvedValue({
      id: 'user-venue-owner',
      app_metadata: {},
    });
    const req = new NextRequest('http://localhost/api/venues/v1/invoices', {
      method: 'POST',
      headers: { authorization: 'Bearer venue-token' },
    });
    try {
      await requirePlatformAdmin(req);
      expect.fail('expected FORBIDDEN');
    } catch (err) {
      expect(err).toBeInstanceOf(TableFlowError);
      expect((err as TableFlowError).code).toBe('FORBIDDEN');
    }
  });

  it('returns actor userId for audited platform admins', async () => {
    getOperatorUser.mockResolvedValue({
      id: 'user-platform-admin',
      app_metadata: { platform_admin: true },
    });
    const req = new NextRequest('http://localhost/api/venues/v1/invoices', {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
    });
    await expect(requirePlatformAdmin(req)).resolves.toEqual({
      userId: 'user-platform-admin',
    });
  });
});
