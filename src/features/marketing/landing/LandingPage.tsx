import { BRAND } from '@/lib/brand';
import { Footer } from './Footer';
import { LandingMotion } from './LandingMotion';
import { LandingScroll } from './LandingScroll';
import { Navbar } from './Navbar';
import { BuildProcess } from './sections/BuildProcess';
import { CallToAction } from './sections/CallToAction';
import { CapabilitiesMarquee } from './sections/CapabilitiesMarquee';
import { FaqSection } from './sections/FaqSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { HeroSection } from './sections/HeroSection';
import { PricingSection } from './sections/PricingSection';
import { StackSection } from './sections/StackSection';
import { TaglineReveal } from './sections/TaglineReveal';
import { TrustedBrand } from './sections/TrustedBrand';

export function LandingPage() {
  return (
    <div id="top" className="landing-root">
      <LandingScroll />
      <LandingMotion />
      <Navbar />
      <main aria-label={`${BRAND.name} overview`} className="relative">
        <HeroSection />
        <TrustedBrand />
        <StackSection />
        <FeaturesSection />
        <TaglineReveal />
        <BuildProcess />
        <PricingSection />
        <CapabilitiesMarquee />
        <FaqSection />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
