import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('email lifecycle', () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it('sendLifecycleEmail no-ops without RESEND_API_KEY', async () => {
    const { sendLifecycleEmail } = await import('./email');
    const result = await sendLifecycleEmail('a@b.com', 'Hi', '<p>Hi</p>');
    expect(result.skipped).toBe(true);
    expect(result.sent).toBe(false);
  });

  it('welcomeEmailHtml includes checklist CTA', async () => {
    const { welcomeEmailHtml } = await import('./email');
    const html = welcomeEmailHtml('Cafe Test', 'http://localhost:3000');
    expect(html).toContain('Cafe Test');
    expect(html).toContain('http://localhost:3000/dashboard');
    expect(html).toContain('Connect Stripe');
  });
});
