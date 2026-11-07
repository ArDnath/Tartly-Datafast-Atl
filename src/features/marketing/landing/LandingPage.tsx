import { BRAND } from '@/lib/brand';
import { Footer } from './Footer';
import { LandingScroll } from './LandingScroll';
import { Navbar } from './Navbar';
import { BuildProcess } from './sections/BuildProcess';
import { CallToAction } from './sections/CallToAction';
import { CapabilitiesMarquee } from './sections/CapabilitiesMarquee';
import { FeaturesSection } from './sections/FeaturesSection';
import { HeroSection } from './sections/HeroSection';
import { PricingSection } from './sections/PricingSection';
import { StackSection } from './sections/StackSection';
import { TrustedBrand } from './sections/TrustedBrand';

export function LandingPage() {
  return (
    <div id="top" className="landing-root">
      <LandingScroll />
      <Navbar />
      <main aria-label={`${BRAND.name} overview`} className="px-4 pb-4 md:px-16 lg:px-24 xl:px-32">
        <HeroSection />
        <TrustedBrand />
        <StackSection />
        <FeaturesSection />
        <BuildProcess />
        <PricingSection />
        <CapabilitiesMarquee />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
