import { describe, it, expect } from 'vitest';
import { RegisterSchema, CreateOrderSchema } from '../src/api';

describe('API schemas', () => {
  it('validates register input', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
      venue_name: 'Test Venue',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid order', () => {
    const result = CreateOrderSchema.safeParse({
      session_id: 'not-a-uuid',
      guest_id: 'not-a-uuid',
      items: [],
    });
    expect(result.success).toBe(false);
  });
});
