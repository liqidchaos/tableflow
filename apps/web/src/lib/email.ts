import { Resend } from 'resend';
import { auditLog } from '@/lib/api';

const FROM = process.env.RESEND_FROM_EMAIL || 'TableFlow <onboarding@tableflow.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type LifecycleEmailKind = 'day0_welcome' | 'day1_qr' | 'day7_summary' | 'day30_trial';

interface LifecyclePayload {
  to: string;
  venueName: string;
  ownerName?: string;
  appUrl?: string;
}

/** Day-0 welcome HTML used by register + schedule helpers. */
export function welcomeEmailHtml(venueName: string, appUrl: string = APP_URL): string {
  const dashboard = `${appUrl}/dashboard`;
  return `
    <p>Welcome to TableFlow.</p>
    <p><strong>${venueName}</strong> is on a 30-day free trial. Your fastest path to a live table:</p>
    <ol>
      <li>Connect Stripe</li>
      <li>Print table QR codes</li>
      <li>Confirm your demo menu (or edit it)</li>
      <li>Place a test order from a phone</li>
    </ol>
    <p><a href="${dashboard}">Open your setup checklist</a></p>
    <p>— TableFlow</p>
  `;
}

function templates(kind: LifecycleEmailKind, payload: LifecyclePayload): { subject: string; html: string } {
  const name = payload.ownerName?.split(' ')[0] || 'there';
  const venue = payload.venueName;
  const appUrl = payload.appUrl || APP_URL;
  const pricing = `${appUrl}/pricing`;

  switch (kind) {
    case 'day0_welcome':
      return {
        subject: `Welcome to TableFlow — ${venue} is ready to set up`,
        html: welcomeEmailHtml(venue, appUrl),
      };
    case 'day1_qr':
      return {
        subject: `${venue}: print your table QR codes`,
        html: `
          <p>Hi ${name},</p>
          <p>Day one tip: print QR codes from <strong>Tables</strong> in the dashboard and put one on every table before service.</p>
          <p>Guests scan → order → kitchen sees it. No app download.</p>
          <p><a href="${appUrl}/tables">Print QRs now</a></p>
          <p>— TableFlow</p>
        `,
      };
    case 'day7_summary':
      return {
        subject: `Your first week on TableFlow`,
        html: `
          <p>Hi ${name},</p>
          <p>You're a week into the trial for <strong>${venue}</strong>. Check Analytics for top items and floor heat — and reply to this email if you want a 15-minute setup call.</p>
          <p><a href="${appUrl}/analytics">View analytics</a></p>
          <p>— TableFlow</p>
        `,
      };
    case 'day30_trial':
      return {
        subject: `Trial ending soon — keep ${venue} live`,
        html: `
          <p>Hi ${name},</p>
          <p>Your 30-day TableFlow trial for <strong>${venue}</strong> is ending. Subscribe to Starter ($99) or Growth ($199) to keep guest ordering and ops running.</p>
          <p>Plus 0.4% GMV platform fee (cap $2/transaction).</p>
          <p><a href="${pricing}">View pricing</a> · <a href="${appUrl}/settings">Manage billing in settings</a></p>
          <p>— TableFlow</p>
        `,
      };
  }
}

/**
 * Send an email via Resend. No-ops when RESEND_API_KEY is missing.
 * Signature matches register route: (to, subject, html).
 */
export async function sendLifecycleEmail(
  to: string,
  subject: string,
  html: string,
  options?: { scheduledAt?: string }
): Promise<{ sent: boolean; skipped?: boolean; id?: string; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.info(`[email] skip — RESEND_API_KEY not set (${subject})`);
    return { sent: false, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(options?.scheduledAt ? { scheduledAt: options.scheduledAt } : {}),
    });
    if (error) {
      console.error('[email] send failed:', error);
      return { sent: false, error: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[email] exception:', err);
    return { sent: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}

/** Schedule Day 1 / 7 / 30 emails (Day 0 is sent by register). Graceful no-op without API key. */
export async function scheduleLifecycleEmails(payload: LifecyclePayload & { venueId: string; actorId?: string }) {
  const schedule: { kind: Exclude<LifecycleEmailKind, 'day0_welcome'>; days: number }[] = [
    { kind: 'day1_qr', days: 1 },
    { kind: 'day7_summary', days: 7 },
    { kind: 'day30_trial', days: 30 },
  ];

  const results: Record<string, { sent: boolean; skipped?: boolean }> = {};

  for (const item of schedule) {
    const { subject, html } = templates(item.kind, payload);
    const scheduledAt = new Date(Date.now() + item.days * 24 * 60 * 60 * 1000).toISOString();
    results[item.kind] = await sendLifecycleEmail(payload.to, subject, html, { scheduledAt });
  }

  try {
    await auditLog(payload.venueId, payload.actorId ?? null, 'lifecycle.emails_scheduled', 'venue', payload.venueId, {
      results,
    });
  } catch {
    // non-blocking
  }

  return { ok: true, results };
}
