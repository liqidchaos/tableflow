'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal, RevealItem } from './motion';

const FAQ_ITEMS = [
  {
    q: 'How does the free trial work?',
    a: 'You get 30 days of full access with no credit card required. At the end of the trial, choose a plan or your account pauses. No surprise charges.',
  },
  {
    q: 'What is the platform fee?',
    a: 'TableFlow charges 0.4% on guest payments processed through the platform, capped at $2 per charge. Subscription fees are separate and billed monthly via Stripe.',
  },
  {
    q: 'Do I need a POS integration?',
    a: 'No. TableFlow runs alongside your existing setup. Guests order from their phone, kitchen gets tickets, and payments flow through Stripe Connect.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your dashboard settings. Your subscription runs through the end of the billing period with no cancellation fees.',
  },
];

export function MarketingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Reveal className="mt-16">
      <RevealItem>
        <h2 className="mb-6 text-center font-serif text-2xl font-light text-luxury-on-surface">
          Frequently asked questions
        </h2>
      </RevealItem>
      <RevealItem>
        <div className="mx-auto max-w-2xl divide-y divide-luxury-outline-variant/30 rounded-lg border border-luxury-outline-variant/30 bg-luxury-surface-low">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-luxury-on-surface">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-luxury-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-luxury-on-surface-variant">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </RevealItem>
    </Reveal>
  );
}
