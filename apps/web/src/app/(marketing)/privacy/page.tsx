export default function PrivacyPage() {
  return (
    <main className="section-padding-xl bg-flagship-surface-lowest">
      <article className="marketing-container max-w-prose text-flagship-on-surface">
        <div className="decorative-rule mb-6" aria-hidden />
        <h1 className="mb-6 font-serif text-[clamp(2rem,4vw,2.5rem)] font-light">Privacy Policy</h1>
        <p className="mb-8 text-flagship-on-surface-variant">Last updated: July 2026</p>

        <section className="grid gap-4 leading-relaxed text-flagship-on-surface-variant">
          <p>
            TableFlow (&quot;we&quot;) provides guest ordering and venue operations software. This policy describes how we collect, use, and protect information when you use our services.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Information we collect</h2>
          <p>
            Venue operators provide account details (name, email, venue name). Guests may provide display names and payment information processed by Stripe. We collect usage data and audit logs for security and product improvement.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">How we use information</h2>
          <p>
            We use data to operate the service, process payments, send transactional emails, improve the product, and comply with legal obligations. We do not sell personal information.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Payment data</h2>
          <p>
            Card payments are handled by Stripe. TableFlow does not store full card numbers. See Stripe&apos;s privacy policy for payment data handling.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Contact</h2>
          <p>
            Questions? Email{' '}
            <a href="mailto:privacy@tableflow.app" className="text-gold no-underline hover:underline">
              privacy@tableflow.app
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
