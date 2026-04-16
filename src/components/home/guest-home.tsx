"use client";

import CTASection from "@/components/main/main.cta-section";
import FeatruresSection from "@/components/main/main.features-section";
import HeroSection from "@/components/main/main.hero-section";

export default function GuestHome() {
  return (
    <div className="bg-linear-to-b from-background to-muted/30">
      <HeroSection />
      <FeatruresSection />
      <CTASection />
    </div>
  );
}
