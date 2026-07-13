'use client';

import Image from 'next/image';
import { Reveal, RevealItem } from './motion';

export function PrecisionSection() {
  return (
    <section id="kitchen" className="section-padding-xl bg-flagship-background">
      <div className="marketing-container max-w-container">
        <Reveal className="mb-16 flex flex-col items-center text-center md:mb-24">
          <RevealItem>
            <div className="decorative-rule mx-auto mb-4" aria-hidden />
          </RevealItem>
          <RevealItem>
            <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2rem)] font-light text-gold">
              The Precision
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-flagship-on-surface-variant">
              Behind every effortless evening is an instrument panel. The pass and the floor,
              synchronized to the second.
            </p>
          </RevealItem>
        </Reveal>

        <Reveal>
          <RevealItem>
            <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
              <div className="carved-edge relative order-2 overflow-hidden md:order-1 md:col-span-7">
                <Image
                  src="/marketing/kitchen-display-hd.png"
                  alt="TableFlow kitchen display showing paid tickets with course timing and rush alerts"
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  sizes="(min-width: 768px) 58vw, 100vw"
                />
              </div>
              <div className="order-1 mb-12 flex flex-col justify-center md:order-2 md:col-span-4 md:col-start-9 md:mb-0">
                <span className="label-caps mb-2 text-gold/50">The Pass</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  Only paid tickets reach the line.
                </h3>
                <p className="m-0 text-base leading-relaxed text-flagship-on-surface-variant">
                  The kitchen display fires the moment payment clears. Course timing, ticket age,
                  and rush alerts keep every plate moving without a single paper chit.
                </p>
              </div>
            </div>
          </RevealItem>
        </Reveal>

        <Reveal className="mt-section-gap">
          <RevealItem>
            <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
              <div className="mb-12 flex flex-col justify-center md:col-span-4 md:mb-0">
                <span className="label-caps mb-2 text-gold/50">The Floor</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  The entire room, at a glance.
                </h3>
                <p className="m-0 text-base leading-relaxed text-flagship-on-surface-variant">
                  A live view of every table: who is ordering, who is dining, who is settling.
                  Guest requests reach the right server before a hand is ever raised.
                </p>
              </div>
              <div className="carved-edge relative overflow-hidden md:col-span-7 md:col-start-6">
                <Image
                  src="/marketing/floor-view-hd.png"
                  alt="TableFlow floor view showing live table statuses across the dining room"
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  sizes="(min-width: 768px) 58vw, 100vw"
                />
              </div>
            </div>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}
