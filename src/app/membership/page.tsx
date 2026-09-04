"use client";

import React from "react";
import { PricingCards } from "@/components/landing/PricingCards";
import { FAQSection } from "@/components/landing/FAQSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { ShieldCheck, CheckCircle2, HeartHandshake, CreditCard } from "lucide-react";

export default function MembershipPage() {
  return (
    <div className="space-y-10 py-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 sm:p-12 shadow-warm text-center max-w-3xl mx-auto space-y-4">
        <span className="badge-mint text-xs">Membership Overview</span>
        <h1 className="text-3xl sm:text-5xl font-bold text-[#162E27] font-serif-heading leading-tight">
          How membership works
        </h1>
        <p className="text-xs sm:text-sm text-[#687B74] leading-relaxed">
          Your annual membership fee covers 24/7 on-demand virtual care, mobile app access, same-day scheduling, and direct provider messaging. In-office visits and labs are billed directly to your health insurance or paid via flexible HSA/FSA.
        </p>
      </div>

      {/* Pricing Cards */}
      <PricingCards />

      {/* Trust Stats */}
      <TrustBar />

      {/* FAQs */}
      <FAQSection />
    </div>
  );
}
