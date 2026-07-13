import Link from 'next/link';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';

export default function HelpPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@tableflow.app';

  return (
    <div>
      <OperatorPageHeader title="Help & Support" description="Quick answers for common operator tasks." />

      <div className="carved-edge mb-6 max-w-2xl border-l-2 border-gold bg-luxury-surface-low p-6">
        <h2 className="mb-2 font-serif text-xl font-light text-luxury-on-surface">
          Go live in under 2 hours
        </h2>
        <ol className="m-0 list-decimal space-y-2 pl-5 text-sm text-luxury-on-surface-variant">
          <li>
            Register at <Link href="/register" className="text-gold no-underline hover:underline">/register</Link> — venue + 4 tables + demo menu are created automatically.
          </li>
          <li>
            Confirm trial pricing on{' '}
            <Link href="/settings" className="text-gold no-underline hover:underline">Settings</Link>{' '}
            (Starter $99 / Growth $199).
          </li>
          <li>
            Enable payments (Stripe Connect in production, or platform charges on staging).
          </li>
          <li>
            Open{' '}
            <Link href="/tables" className="text-gold no-underline hover:underline">Tables</Link>{' '}
            → <strong className="text-luxury-on-surface">Print all QRs</strong> → place one per table.
          </li>
          <li>
            Review{' '}
            <Link href="/menu" className="text-gold no-underline hover:underline">Menu</Link>, then
            scan a QR from your phone and place a paid test order.
          </li>
          <li>
            Confirm the ticket appears on{' '}
            <Link href="/kds" className="text-gold no-underline hover:underline">Kitchen Display</Link>{' '}
            only after payment clears.
          </li>
        </ol>
      </div>

      <div className="grid max-w-2xl gap-4">
        {[
          {
            title: 'Print table QR codes',
            body: 'Go to Tables and use Print all QRs (or print one table at a time). Place one on every table so guests can scan to order.',
            href: '/tables',
          },
          {
            title: '86 (hide) a menu item',
            body: 'Open Menu, find the item, and toggle availability off. It disappears from the guest menu immediately.',
            href: '/menu',
          },
          {
            title: 'Kitchen display (KDS)',
            body: 'Open Kitchen Display from the sidebar. New orders appear in real time — tap items to mark preparing or done. Only paid tickets fire.',
            href: '/kds',
          },
          {
            title: 'Issue a refund',
            body: 'Go to Orders, find a captured payment, and tap Refund. Refunds process through your connected Stripe account.',
            href: '/orders',
          },
          {
            title: 'Connect Stripe for payments',
            body: 'Settings → Stripe Connect → Connect Stripe. Complete onboarding to accept guest card payments.',
            href: '/settings',
          },
        ].map((item) => (
          <div key={item.title} className="card">
            <h3 className="mb-2 font-serif text-lg font-light">{item.title}</h3>
            <p className="mb-3 text-sm text-luxury-on-surface-variant">{item.body}</p>
            <Link href={item.href} className="label-caps text-gold no-underline hover:underline">
              Open →
            </Link>
          </div>
        ))}

        <div className="carved-edge bg-luxury-surface-high p-6">
          <h3 className="mb-2 font-serif text-lg font-light">Need more help?</h3>
          <p className="mb-3 text-sm text-luxury-on-surface-variant">
            Email us and we&apos;ll get back within one business day.
          </p>
          <a href={`mailto:${supportEmail}`} className="font-medium text-gold no-underline hover:underline">
            {supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
