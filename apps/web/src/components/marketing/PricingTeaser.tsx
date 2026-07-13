'use client';

import Link from 'next/link';
import { Reveal, RevealItem } from './motion';
import { PLANS } from './PricingCards';

export function PricingTeaser() {
  const starter = PLANS[0];
  const growth = PLANS[1];

  return (
    <section id="pricing" className="section-padding-xl bg-luxury-bg">
      <div className="marketing-container max-w-container">
        <Reveal className="mb-12 md:mb-16">
          <RevealItem>
            <div className="decorative-rule mb-4" aria-hidden />
          </RevealItem>
          <RevealItem>
            <h2 className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] font-light leading-[1.1] tracking-[-0.02em] text-balance text-luxury-on-surface">
              Simple plans. No surprises.
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-luxury-on-surface-variant">
              Plus a 0.4% platform fee on guest payments, capped at $2 per charge. That&apos;s it.
            </p>
          </RevealItem>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          {[starter, growth].map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <RevealItem className="h-full">
                <div
                  className={`carved-edge flex h-full flex-col bg-luxury-surface-low p-7 md:p-8 ${
                    plan.highlighted ? 'border-gold/30 shadow-gold' : ''
                  }`}
                >
                  {plan.highlighted && (
                    <span className="label-caps mb-4 inline-flex w-fit text-gold">Most popular</span>
                  )}
                  {!plan.highlighted && <span className="mb-4 block h-[14px]" aria-hidden />}
                  <h3 className="mb-2 font-serif text-xl font-light text-luxury-on-surface">{plan.name}</h3>
                  <p className="mb-1 font-serif text-[clamp(2.5rem,5vw,3.5rem)] font-light leading-none tracking-[-0.03em] text-luxury-on-surface">
                    ${plan.price}
                    <span className="text-lg font-normal text-luxury-on-surface-variant">/mo</span>
                  </p>
                  <p className="mb-6 text-sm text-luxury-on-surface-variant">{plan.tables}</p>
                  <ul className="m-0 mb-8 flex flex-1 list-none flex-col gap-2.5 p-0">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature.text} className="flex items-center gap-2.5 text-sm text-luxury-on-surface/80">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-gold/50" aria-hidden />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`label-caps inline-flex items-center justify-center rounded-sm px-6 py-3 no-underline transition-all ${
                      plan.highlighted
                        ? 'glowing-gold bg-gold-container text-gold-on hover:bg-gold'
                        : 'border border-luxury-outline-variant text-luxury-on-surface hover:border-gold/50 hover:text-gold'
                    }`}
                  >
                    Start free trial
                  </Link>
                </div>
              </RevealItem>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10">
          <RevealItem>
            <Link
              href="/pricing"
              className="text-sm font-medium text-luxury-on-surface-variant no-underline transition-colors hover:text-gold"
            >
              See full pricing →
            </Link>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}
