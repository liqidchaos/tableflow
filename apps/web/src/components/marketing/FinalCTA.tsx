'use client';

import Link from 'next/link';
import { Reveal, RevealItem } from './motion';

export function FinalCTA() {
  return (
    <section className="border-t border-luxury-outline-variant/20 bg-luxury-surface-lowest py-20 md:py-28">
      <Reveal className="marketing-container max-w-container text-center">
        <RevealItem>
          <div className="decorative-rule mx-auto mb-6" aria-hidden />
        </RevealItem>
        <RevealItem>
          <h2 className="mb-5 font-serif text-[clamp(1.75rem,4vw,2.5rem)] font-light leading-[1.1] tracking-[-0.02em] text-balance text-luxury-on-surface md:mb-6">
            Ready to run a faster floor?
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-luxury-on-surface-variant md:mb-12">
            30-day free trial. No credit card. No POS integration required.
          </p>
        </RevealItem>
        <RevealItem>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="label-caps btn-flagship-primary glowing-gold inline-flex items-center justify-center rounded-sm px-8 py-4 no-underline"
            >
              Start free trial
            </Link>
            <Link
              href="/pricing"
              className="label-caps btn-flagship-outline inline-flex items-center justify-center rounded-sm px-8 py-4 no-underline"
            >
              See pricing
            </Link>
          </div>
        </RevealItem>
      </Reveal>
    </section>
  );
}
