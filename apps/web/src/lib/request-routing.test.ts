import { describe, expect, it } from 'vitest';
import { resolveRequestRouteTarget } from './push';

describe('resolveRequestRouteTarget', () => {
  it('routes to assigned server when active with push token', () => {
    expect(
      resolveRequestRouteTarget({
        assignedStaffId: 'staff-1',
        assignee: {
          id: 'staff-1',
          push_token: 'ExponentPushToken[abc]',
          is_active: true,
          role: 'server',
        },
      })
    ).toEqual({ mode: 'assigned', staffId: 'staff-1', pushToken: 'ExponentPushToken[abc]' });
  });

  it('broadcasts when table is unassigned', () => {
    expect(
      resolveRequestRouteTarget({
        assignedStaffId: null,
        assignee: null,
      })
    ).toEqual({ mode: 'broadcast', staffId: null, pushToken: null });
  });

  it('broadcasts when assignee has no push token', () => {
    expect(
      resolveRequestRouteTarget({
        assignedStaffId: 'staff-1',
        assignee: {
          id: 'staff-1',
          push_token: null,
          is_active: true,
          role: 'server',
        },
      })
    ).toEqual({ mode: 'broadcast', staffId: 'staff-1', pushToken: null });
  });

  it('broadcasts when assignee is kitchen-only', () => {
    expect(
      resolveRequestRouteTarget({
        assignedStaffId: 'staff-k',
        assignee: {
          id: 'staff-k',
          push_token: 'ExponentPushToken[abc]',
          is_active: true,
          role: 'kitchen',
        },
      })
    ).toEqual({ mode: 'broadcast', staffId: 'staff-k', pushToken: null });
  });
});
