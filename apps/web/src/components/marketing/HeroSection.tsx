'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Parallax, Reveal, RevealItem } from './motion';

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-radial-depth">
      <Parallax className="absolute inset-0 overflow-hidden">
        <div className="hero-photo h-full w-full" aria-hidden />
      </Parallax>

      <div className="relative z-10">
        <div className="marketing-container flex min-h-[100svh] max-w-container flex-col justify-center pb-section-gap pt-[calc(var(--nav-height)+2.5rem)]">
          <Reveal className="max-w-3xl" delay={0.2} immediate stagger={0.12}>
            <RevealItem>
              <div className="decorative-rule mb-8" aria-hidden />
            </RevealItem>
            <RevealItem>
              <h1 className="mb-6 font-serif text-[clamp(2.5rem,6vw,4rem)] font-light leading-[1.1] tracking-[-0.02em] text-balance text-flagship-on-surface md:mb-8">
                Redefining{' '}
                <br className="hidden sm:block" />
                <span className="italic text-gold">The Flow</span> of{' '}
                <br className="hidden sm:block" />
                Fine Dining.
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="mb-8 max-w-md text-lg font-light leading-relaxed text-flagship-on-surface-variant md:mb-10">
                An orchestrated symphony from scan to the final pour. Seamlessly scan to pay,
                immersing guests in the pure art of the meal.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="label-caps btn-flagship-primary glowing-gold inline-flex items-center justify-center rounded-sm px-8 py-4 no-underline"
                >
                  Experience now
                </Link>
                <a
                  href="#orchestration"
                  className="label-caps btn-flagship-outline inline-flex items-center justify-center rounded-sm px-8 py-4 no-underline tracking-widest"
                >
                  Discover
                </a>
              </div>
            </RevealItem>
          </Reveal>

          <motion.div
            className="mt-auto flex justify-center pt-12"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
          >
            <ChevronDown className="h-5 w-5 animate-bounce text-flagship-on-surface-variant/50" strokeWidth={1.5} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
