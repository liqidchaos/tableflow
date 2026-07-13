import { HeroSection } from '@/components/marketing/HeroSection';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { PrecisionSection } from '@/components/marketing/PrecisionSection';
import { MetricsStrip } from '@/components/marketing/MetricsStrip';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <HowItWorksSection />
      <PrecisionSection />
      <MetricsStrip />
      <PricingTeaser />
      <FinalCTA />
    </main>
  );
}
