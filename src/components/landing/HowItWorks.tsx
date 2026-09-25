"use client";

import React from "react";
import { Stethoscope, Building2, HeartHandshake } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Choose a Visit",
      desc: "Request an outpatient appointment for a service currently offered by the Habitat clinic.",
      icon: Stethoscope,
    },
    {
      number: "02",
      title: "Attend Your Appointment",
      desc: "Visit the clinic at your confirmed appointment time. Ask staff about current service availability and fees.",
      icon: Building2,
    },
    {
      number: "03",
      title: "Follow Up or Get Referred",
      desc: "Follow your care plan or receive a referral when you need services beyond outpatient clinic capability.",
      icon: HeartHandshake,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">Habitat Medium Clinic</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#162E27] font-serif-heading">
          How outpatient care works
        </h2>
        <p className="text-xs sm:text-sm text-[#687B74] leading-relaxed">
          Three steps for planned outpatient care at NiniMed Habitat Clinic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {steps.map((step, idx) => (
          <div
            key={step.number}
            className="p-8 rounded-3xl bg-white border border-[#E7E2D8] hover:border-sky-500 hover:shadow-warm transition-all duration-200 space-y-4 relative flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                  <step.icon className="w-6 h-6" />
                </div>
                <span className="text-3xl font-bold text-[#E7E2D8] font-display select-none">{step.number}</span>
              </div>
              <h3 className="text-lg font-bold text-[#162E27] font-display">{step.title}</h3>
              <p className="text-xs text-[#687B74] leading-relaxed">{step.desc}</p>
            </div>
            <div className="pt-3 border-t border-[#F2EFE9]">
              <span className="text-[11px] font-bold uppercase text-sky-600">Step {idx + 1} of 3</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
