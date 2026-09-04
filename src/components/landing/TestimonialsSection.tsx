"use client";

import React from "react";
import { Star, Quote, CheckCircle2 } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Hannah Kebede",
      role: "Verified Patient · Family Member",
      condition: "Cardiometabolic & Preventive Care",
      rating: 5,
      quote:
        "The digital summary explained my lab trends so clearly before I even met with my physician. For the first time in years, my metabolic markers are optimal. The multidisciplinary care is unmatched.",
      doctor: "Attending: Department of Internal Medicine",
    },
    {
      name: "Michael Yohannes",
      role: "Verified Patient · Virtual Urgent Care",
      condition: "Same-Day Urgent Care",
      rating: 5,
      quote:
        "Connecting with a clinician on video on a Sunday evening took under 2 minutes. My prescription was sent directly to my local pharmacy, and the checkout was completely frictionless.",
      doctor: "Attending: Virtual Urgent Care Care Team",
    },
    {
      name: "Bethlehem Tadesse",
      role: "Verified Patient · Corporate Health Member",
      condition: "Preventive Nutrition & Health",
      rating: 5,
      quote:
        "The personalized care plan and messaging fit my busy schedule seamlessly. Having on-demand access to our primary care team makes health management feel simple and empowering.",
      doctor: "Attending: Primary Care Team",
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">Patient Experiences</span>
        <h2 className="text-3xl font-bold text-[#162E27] font-display">Real outcomes from our members</h2>
        <p className="text-sm text-[#687B74] leading-relaxed">
          Over 98.4% of our patients report exceptional care satisfaction and prompt symptom resolution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="card-warm p-8 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[#E5A93C]">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#E5A93C]" />
                  ))}
                </div>
                <Quote className="w-6 h-6 text-[#005C4B]/20" />
              </div>
              <p className="text-xs text-[#33413C] italic leading-relaxed">"{t.quote}"</p>
            </div>

            <div className="space-y-1 pt-4 border-t border-[#F2EFE9]">
              <h4 className="text-xs font-bold text-[#162E27] flex items-center gap-1.5">
                <span>{t.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#005C4B]" />
              </h4>
              <p className="text-[11px] text-[#005C4B] font-medium">{t.condition}</p>
              <p className="text-[10px] text-[#687B74]">{t.doctor}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
