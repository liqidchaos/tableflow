'use client';

import { CountUp, Reveal, RevealItem } from './motion';

const METRICS = [
  { prefix: '<', value: 2, suffix: 'h', label: 'Average setup time' },
  { value: 0, label: 'App downloads required' },
  { value: 0.4, suffix: '%', decimals: 1, label: 'GMV platform fee' },
  { prefix: '$', value: 2, label: 'Fee cap per charge' },
];

export function MetricsStrip() {
  return (
    <section className="section-padding-xl border-y border-luxury-outline-variant/20 bg-luxury-surface-lowest">
      <div className="marketing-container max-w-container">
        <Reveal
          className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-x-8 md:gap-y-12"
          stagger={0.06}
        >
          <RevealItem className="col-span-2 md:col-span-4">
            <p className="label-caps m-0 text-luxury-on-surface-variant/70">Why operators switch</p>
          </RevealItem>

          {METRICS.map((metric) => (
            <RevealItem key={metric.label}>
              <p className="mb-2 font-serif text-[clamp(2.5rem,6vw,4rem)] font-light leading-none tracking-[-0.03em] text-gold">
                <CountUp
                  value={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                  decimals={metric.decimals}
                />
              </p>
              <p className="label-caps m-0 text-luxury-on-surface-variant/60">{metric.label}</p>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
