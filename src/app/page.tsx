
import Homefooter from '@/components/layout/home.footer';
import Homeheader from '@/components/layout/home.header';
import CTASection from '@/components/main/main.cta-section';
import FeatruresSection from '@/components/main/main.features-section';
import HeroSection from '@/components/main/main.hero-section';




export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      {/* Header */}
      <Homeheader />
      {/* Hero Section */}
      <HeroSection />
      {/* Features Section */}
      <FeatruresSection />
      {/* CTA Section */}
      <CTASection />
      {/* Footer */}
      <Homefooter />
    </div>
  );
}
