"use client";

import React from "react";
import { UserPlus, Sparkles, Stethoscope, ArrowRight, Zap, Building2, HeartHandshake } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Join or Book On-Demand",
      desc: "Sign up in 2 minutes or start a 24/7 Treat Me Now™ virtual visit without an appointment from your phone or computer.",
      icon: Zap,
    },
    {
      number: "02",
      title: "See Your Doctor Without the Wait",
      desc: "Connect instantly via HD video or walk into one of our calm, beautifully designed clinics. Enjoy zero waiting room delays.",
      icon: Building2,
    },
    {
      number: "03",
      title: "Stay Connected with Your Care Team",
      desc: "Message your doctor 24/7, track lab test explanations, and refill prescriptions with a single click inside your health app.",
      icon: HeartHandshake,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">Frictionless Healthcare</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#162E27] font-serif-heading">
          How One Medical membership works
        </h2>
        <p className="text-xs sm:text-sm text-[#687B74] leading-relaxed">
          Three simple steps to world-class clinical care, from instant 24/7 triage to long-term preventive wellness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {steps.map((step, idx) => (
          <div
            key={step.number}
            className="p-8 rounded-3xl bg-white border border-[#E7E2D8] hover:border-[#005C4B] hover:shadow-warm transition-all duration-200 space-y-4 relative flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center">
                  <step.icon className="w-6 h-6" />
                </div>
                <span className="text-3xl font-bold text-[#E7E2D8] font-display select-none">{step.number}</span>
              </div>
              <h3 className="text-lg font-bold text-[#162E27] font-display">{step.title}</h3>
              <p className="text-xs text-[#687B74] leading-relaxed">{step.desc}</p>
            </div>
            <div className="pt-3 border-t border-[#F2EFE9]">
              <span className="text-[11px] font-bold uppercase text-[#005C4B]">Step {idx + 1} of 3</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
