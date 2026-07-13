'use client';

import { Reveal, RevealItem } from './motion';

export function HowItWorksSection() {
  return (
    <section id="orchestration" className="section-padding-xl bg-flagship-surface-lowest bg-radial-depth">
      <div className="marketing-container max-w-container">
        <Reveal className="mb-16 flex flex-col items-center text-center md:mb-24">
          <RevealItem>
            <div className="decorative-rule mx-auto mb-4" aria-hidden />
          </RevealItem>
          <RevealItem>
            <h2 className="font-serif text-[clamp(1.75rem,3.5vw,2rem)] font-light text-gold">
              The Orchestration
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-flagship-on-surface-variant">
              A meticulously curated journey, ensuring every touchpoint is as refined as the cuisine itself.
            </p>
          </RevealItem>
        </Reveal>

        <Reveal>
          <RevealItem>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              <div className="mb-12 flex flex-col justify-center md:col-span-7 md:mb-0 md:pr-12">
                <span className="label-caps mb-2 text-gold/50">01</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  The Arrival
                </h3>
                <p className="m-0 text-base leading-relaxed text-flagship-on-surface-variant">
                  Guests scan the QR at their table. No app download. Your team knows who is seated
                  before the first course arrives.
                </p>
              </div>
              <div className="carved-edge relative h-[400px] md:col-span-5">
                <div
                  className="h-full w-full bg-cover bg-center grayscale transition-all duration-700 hover:grayscale-0"
                  style={{ backgroundImage: "url('/marketing/step-service.jpg')" }}
                  aria-hidden
                />
              </div>
            </div>
          </RevealItem>
        </Reveal>

        <Reveal className="mt-section-gap">
          <RevealItem>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              <div className="carved-edge relative order-2 h-[500px] md:order-1 md:col-span-6">
                <div
                  className="h-full w-full bg-cover bg-center opacity-80 mix-blend-luminosity transition-all duration-700 hover:mix-blend-normal"
                  style={{ backgroundImage: "url('/marketing/step-pay.jpg')" }}
                  aria-hidden
                />
              </div>
              <div className="order-1 mb-12 flex flex-col justify-center md:order-2 md:col-span-5 md:col-start-8 md:mb-0">
                <span className="label-caps mb-2 text-gold/50">02</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  The Service
                </h3>
                <p className="mb-12 text-base leading-relaxed text-flagship-on-surface-variant">
                  Discreet, anticipatory table management. Guests order from their phone while staff
                  deliver an invisible, yet deeply felt, level of care.
                </p>
                <span className="label-caps mb-2 text-gold/50">03</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  The Transaction
                </h3>
                <p className="m-0 text-base leading-relaxed text-flagship-on-surface-variant">
                  The check is a relic. Scan to pay clears before the kitchen fires, allowing
                  departure on their own terms, devoid of friction.
                </p>
              </div>
            </div>
          </RevealItem>
        </Reveal>

        <Reveal className="mt-section-gap">
          <RevealItem>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              <div className="mb-12 flex flex-col justify-center md:col-span-5 md:mb-0">
                <span className="label-caps mb-2 text-gold/50">04</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  The Kitchen
                </h3>
                <p className="mb-12 text-base leading-relaxed text-flagship-on-surface-variant">
                  Paid tickets hit the line in real time. Course timing, age tracking, and rush alerts
                  keep the pass synchronized with the floor.
                </p>
                <span className="label-caps mb-2 text-gold/50">05</span>
                <h3 className="mb-4 font-serif text-[clamp(1.25rem,2.5vw,1.75rem)] font-light text-flagship-on-surface">
                  Anytime
                </h3>
                <p className="m-0 text-base leading-relaxed text-flagship-on-surface-variant">
                  Guests add rounds, call the server, or close the tab from the same screen. No
                  re-scanning, no friction, no interruption to the meal.
                </p>
              </div>
              <div className="carved-edge relative h-[500px] md:col-span-7">
                <div
                  className="h-full w-full bg-cover bg-center opacity-80 mix-blend-luminosity transition-all duration-700 hover:mix-blend-normal hover:opacity-100"
                  style={{ backgroundImage: "url('/marketing/step-kitchen.jpg')" }}
                  role="img"
                  aria-label="Chefs plating dishes at a luxury restaurant pass"
                />
              </div>
            </div>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
}
