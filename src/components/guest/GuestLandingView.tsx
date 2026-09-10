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
    <div className="min-h-screen text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <main className="flex-1 space-y-4 sm:space-y-6" id="main-content">
        {/* 1. Mobile Native App Header Quick Badge (Only on mobile for app feel) */}
        <div className="md:hidden px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#005C4B] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              NM
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white font-display">
              Nini<span className="text-[#005C4B] dark:text-teal-400">Med</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              24/7 Care Live
            </span>
          </div>
        </div>

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
