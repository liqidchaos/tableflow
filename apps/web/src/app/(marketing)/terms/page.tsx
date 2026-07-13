export default function TermsPage() {
  return (
    <main className="section-padding-xl bg-flagship-surface-lowest">
      <article className="marketing-container max-w-prose text-flagship-on-surface">
        <div className="decorative-rule mb-6" aria-hidden />
        <h1 className="mb-6 font-serif text-[clamp(2rem,4vw,2.5rem)] font-light">Terms of Service</h1>
        <p className="mb-8 text-flagship-on-surface-variant">Last updated: July 2026</p>

        <section className="grid gap-4 leading-relaxed text-flagship-on-surface-variant">
          <p>By using TableFlow, you agree to these terms. If you do not agree, do not use the service.</p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Service</h2>
          <p>
            TableFlow provides software for guest ordering, kitchen operations, and payment facilitation. We may update features with reasonable notice.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Subscriptions &amp; fees</h2>
          <p>
            Paid plans are billed monthly via Stripe. A 30-day free trial is offered without a credit card. A platform fee of 0.4% (capped at $2) applies to guest payments processed through TableFlow.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Venue responsibilities</h2>
          <p>
            You are responsible for menu accuracy, tax compliance, staff training, and lawful use of guest data. You must maintain a valid Stripe Connect account to accept payments.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Limitation of liability</h2>
          <p>
            TableFlow is provided &quot;as is.&quot; We are not liable for indirect damages. Our total liability is limited to fees paid in the prior 12 months.
          </p>
          <h2 className="mt-4 font-serif text-xl font-light text-flagship-on-surface">Contact</h2>
          <p>
            Legal inquiries:{' '}
            <a href="mailto:legal@tableflow.app" className="text-gold no-underline hover:underline">
              legal@tableflow.app
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
