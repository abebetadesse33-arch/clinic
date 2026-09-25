"use client";

import React from "react";
import { CreditCard, ShieldCheck, HeartHandshake, Clock, Building2, Stethoscope } from "lucide-react";

export function WhyChooseUs() {
  const benefits = [
    {
      title: "Outpatient Care",
      desc: "Consultations and planned follow-up delivered by appropriately qualified clinicians within the clinic's approved scope.",
      icon: Clock,
    },
    {
      title: "Primary & Specialist Consultations",
      desc: "Book primary care and scheduled specialist visits based on actual clinician availability.",
      icon: Stethoscope,
    },
    {
      title: "Habitat Clinic",
      desc: "A medium-size outpatient clinic planned for the Habitat area of Debre Birhan. Verify the address and hours before visiting.",
      icon: Building2,
    },
    {
      title: "Continuity & Referral",
      desc: "Support for follow-up and coordination with higher-level facilities when a patient's needs exceed outpatient capability.",
      icon: HeartHandshake,
    },
    {
      title: "Transparent Fees",
      desc: "Ask the clinic to confirm current service prices and accepted payment methods before your visit.",
      icon: CreditCard,
    },
    {
      title: "Service Availability",
      desc: "Laboratory, pharmacy, imaging, vaccination, and other ancillary services are offered only when separately authorized and available.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">The Clinical Experience</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif-heading">
          Why choose NiniMed Habitat Clinic
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Respectful outpatient care, clear communication, and referral pathways appropriate to a medium clinic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-sky-500 hover:shadow-warm transition-all duration-200 space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <b.icon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">{b.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
