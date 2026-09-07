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
import { ArrowRight, Download, Smartphone } from "lucide-react";
import Link from "next/link";

export default function GuestLandingView() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),transparent_25%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef7f5_100%)] text-slate-800 font-sans flex flex-col">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <main className="flex-1 space-y-4" id="main-content">
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

        <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6" aria-labelledby="app-promo-title">
          <div className="rounded-[28px] bg-[#0B3B32] text-white p-6 sm:p-10 lg:p-12 overflow-hidden relative shadow-warm-lg">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-emerald-300/20" aria-hidden="true" />
            <div className="relative grid lg:grid-cols-[1fr_auto] items-center gap-8">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200"><Smartphone className="w-4 h-4" /> Care in your pocket</div>
                <h2 id="app-promo-title" className="text-2xl sm:text-4xl font-bold font-serif-heading">Your care team, wherever the day takes you.</h2>
                <p className="text-sm leading-relaxed text-emerald-50/80">Book visits, review lab results, message your clinician, and keep your family health records together in one secure hub.</p>
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Link href="/patient/dashboard" className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0B3B32] hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B3B32]"><Download className="w-4 h-4" /> Open Health Hub</Link>
                  <Link href="/patient/book" className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><span>Book your first visit</span><ArrowRight className="w-4 h-4" /></Link>
                </div>
              </div>
              <div className="hidden sm:flex w-32 h-44 rounded-[24px] border-4 border-white/20 bg-gradient-to-b from-emerald-300/30 to-cyan-300/10 items-end justify-center p-3 rotate-3 shadow-2xl" aria-hidden="true"><div className="w-full h-1/2 rounded-xl bg-white/15" /></div>
            </div>
          </div>
        </section>

        {/* 9. Frequently Asked Questions */}
        <FAQSection />
      </main>

      {/* 10. Multi-Column Clinical Footer */}
      <LandingFooter />
    </div>
  );
}
