"use client";

import React from "react";
import { Sparkles, Video, Dna, CreditCard, ShieldCheck, HeartHandshake, Clock, Building2 } from "lucide-react";

export function WhyChooseUs() {
  const benefits = [
    {
      title: "Longer, Un-Rushed Appointments",
      desc: "Our salaried doctors spend 30–45 minutes with you to truly listen, explain diagnoses, and develop personalized preventive plans.",
      icon: Clock,
    },
    {
      title: "24/7 Treat Me Now™ Virtual Care",
      desc: "Connect with licensed attending clinicians from your phone in under 3 minutes. Fast e-prescriptions and same-day lab orders.",
      icon: Video,
    },
    {
      title: "Serene, Welcoming Offices",
      desc: "Experience calm lighting, complimentary organic tea, comfortable lounges, and on-site blood drawing rooms with zero waiting room delays.",
      icon: Building2,
    },
    {
      title: "Whole-Person Collaborative Care",
      desc: "Primary care physicians, nurse practitioners, dietitians, and mental health therapists work together on a unified patient chart.",
      icon: HeartHandshake,
    },
    {
      title: "Transparent, Predictable Billing",
      desc: "Simple membership plans, zero surprise medical bills, transparent copays, and full HSA/FSA and major insurance compatibility.",
      icon: CreditCard,
    },
    {
      title: "Enterprise HIPAA & Cryptographic Security",
      desc: "Your confidential medical records and clinical notes are protected with end-to-end encryption and strict privacy standards.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">The One Medical Experience</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#162E27] font-serif-heading">
          Why members love NiniMed
        </h2>
        <p className="text-xs sm:text-sm text-[#687B74] leading-relaxed">
          Combining human-centered relationship medicine with modern technology and effortless convenience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="p-6 rounded-3xl bg-white border border-[#E7E2D8] hover:border-[#005C4B] hover:shadow-warm transition-all duration-200 space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center">
              <b.icon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#162E27] font-display">{b.title}</h3>
            <p className="text-xs text-[#687B74] leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
