"use client";

import React from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { ServiceCards } from "@/components/landing/ServiceCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhyChooseUs } from "@/components/landing/WhyChooseUs";
import { PricingCards } from "@/components/landing/PricingCards";
import { DoctorDirectory } from "@/components/landing/DoctorDirectory";
import { FAQSection } from "@/components/landing/FAQSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function GuestLandingView() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),transparent_25%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef7f5_100%)] text-slate-800 font-sans flex flex-col">
      <main className="flex-1 space-y-4">
        {/* 2. Hero Section with Editorial Headline & 24/7 Care Indicator */}
        <HeroSection />

        {/* 3. Trust Bar with 10k+ Patients, CSAT & Certifications */}
        <TrustBar />

        {/* 4. Comprehensive Care Service Cards */}
        <ServiceCards />

        {/* 5. How It Works - 3-Step Visual Timeline */}
        <HowItWorks />

        {/* 6. Why Choose Us - Whole-Person Care & Un-rushed Doctors */}
        <WhyChooseUs />

        {/* 7. Transparent Membership Pricing */}
        <PricingCards />

        {/* 8. Attending Physicians & Specialist Directory */}
        <DoctorDirectory />

        {/* 9. Frequently Asked Questions */}
        <FAQSection />
      </main>

      {/* 10. Multi-Column Clinical Footer */}
      <LandingFooter />
    </div>
  );
}
