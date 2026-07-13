'use client';

import {
  BarChart3,
  Check,
  ChefHat,
  CreditCard,
  Package,
  QrCode,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Reveal, RevealItem } from './motion';

export interface Plan {
  name: string;
  price: number;
  tables: string;
  features: { icon: LucideIcon; text: string }[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: 99,
    tables: 'Up to 20 tables',
    features: [
      { icon: QrCode, text: 'Guest web ordering' },
      { icon: ChefHat, text: 'Kitchen display' },
      { icon: CreditCard, text: 'Stripe payments' },
      { icon: BarChart3, text: 'Basic analytics' },
    ],
  },
  {
    name: 'Growth',
    price: 199,
    tables: 'Unlimited tables',
    highlighted: true,
    features: [
      { icon: Check, text: 'Everything in Starter' },
      { icon: Sparkles, text: 'AI upsell suggestions' },
      { icon: Package, text: 'Inventory tracking' },
      { icon: Users, text: 'Priority support' },
    ],
  },
];

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      {PLANS.map((plan, i) => (
        <Reveal key={plan.name} delay={i * 0.08}>
          <RevealItem className="h-full">
            <div
              className={`carved-edge flex h-full flex-col bg-luxury-surface-low p-7 md:p-8 ${
                plan.highlighted ? 'border-gold/30 shadow-gold' : ''
              }`}
            >
              {plan.highlighted ? (
                <span className="label-caps mb-4 inline-flex w-fit text-gold">Most popular</span>
              ) : (
                <span className="mb-4 block h-[14px]" aria-hidden />
              )}
              <h2 className="mb-2 font-serif text-xl font-light text-luxury-on-surface">{plan.name}</h2>
              <p className="mb-4 font-serif text-[clamp(2.5rem,5vw,3.5rem)] font-light leading-none tracking-[-0.03em] text-luxury-on-surface">
                ${plan.price}
                <span className="text-lg font-normal text-luxury-on-surface-variant">/mo</span>
              </p>
              <p className="mb-6 text-sm text-luxury-on-surface-variant">{plan.tables}</p>
              <ul className="mb-8 flex flex-1 list-none flex-col gap-3 p-0">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3 text-sm text-luxury-on-surface/80">
                    <feature.icon size={18} className="shrink-0 text-gold" />
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
  );
}
