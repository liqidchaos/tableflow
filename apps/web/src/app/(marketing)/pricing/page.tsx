import { PricingCards } from '@/components/marketing/PricingCards';
import { MarketingFAQ } from '@/components/marketing/MarketingFAQ';
import { Reveal, RevealItem } from '@/components/marketing/motion';

export default function PricingPage() {
  return (
    <main className="section-padding-xl">
      <div className="marketing-container max-w-container">
        <Reveal className="mb-12 text-center md:mb-16">
          <RevealItem>
            <div className="decorative-rule mx-auto mb-4" aria-hidden />
          </RevealItem>
          <RevealItem>
            <h1 className="mb-4 font-serif text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight text-balance text-luxury-on-surface">
              Run the floor. We handle the rest.
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mx-auto max-w-lg text-base text-luxury-on-surface-variant">
              30-day free trial · No credit card required · Cancel anytime
            </p>
          </RevealItem>
        </Reveal>

        <PricingCards />

        <Reveal className="mt-12">
          <RevealItem>
            <div className="carved-edge bg-luxury-surface-low px-6 py-10 text-center md:px-12">
              <p className="label-caps mb-2 text-luxury-on-surface-variant/70">
                Platform fee on guest payments
              </p>
              <p className="mb-2 font-serif text-4xl font-light text-luxury-on-surface">
                0.4%{' '}
                <span className="text-lg font-normal text-luxury-on-surface-variant">
                  capped at $2 per charge
                </span>
              </p>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-luxury-on-surface-variant">
                Only applies when guests pay through TableFlow. Stripe processing fees are separate.
              </p>
              <p className="mt-4 text-sm text-luxury-on-surface-variant/70">
                Multi-venue groups?{' '}
                <a href="mailto:hello@tableflow.app" className="text-gold no-underline hover:underline">
                  Contact us
                </a>{' '}
                for custom pricing.
              </p>
            </div>
          </RevealItem>
        </Reveal>

        <MarketingFAQ />
      </div>
    </main>
  );
}
