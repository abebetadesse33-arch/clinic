"use client";

import React from "react";
import Link from "next/link";
import { Stethoscope, Calendar, CheckCircle2, Clock, MapPin, HeartPulse, ArrowRight, ShieldCheck } from "lucide-react";

export default function PrimaryCarePage() {
  const features = [
    "Comprehensive 45-minute annual physicals & baseline biometric panels",
    "Cardiovascular risk assessment, lipid tracking, and blood pressure optimization",
    "Digestive health, thyroid function, and metabolic management",
    "Mental health screenings for anxiety, depression, and stress reduction",
    "On-site diagnostic blood draws, immunizations, and vaccine boosters",
    "Direct messaging with your primary physician between visits",
  ];

  return (
    <div className="space-y-12 py-6">
      {/* Hero */}
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 sm:p-12 shadow-warm">
        <div className="max-w-3xl space-y-5">
          <span className="badge-mint text-xs">Primary Care & Family Medicine</span>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#162E27] font-serif-heading leading-tight">
            Primary care designed around real relationships
          </h1>
          <p className="text-sm sm:text-base text-[#687B74] leading-relaxed">
            Our primary care doctors take the time to know you, your medical history, and your personal goals. With 30 to 45-minute appointments, on-site labs, and continuous app messaging, we make staying healthy effortless.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/patient/book?reason=annual-wellness"
              className="btn-pill-primary w-full sm:w-auto"
            >
              <span>Book Primary Care Visit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/locations"
              className="btn-pill-secondary w-full sm:w-auto"
            >
              <span>Find a Clinic Location</span>
            </Link>
          </div>
        </div>
      </div>

      {/* What We Treat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#162E27] font-display">What We Cover</h2>
          <p className="text-xs text-[#687B74] leading-relaxed">
            Whether you need a proactive checkup or management for a chronic condition, our attending physicians are your long-term health advocates.
          </p>
          <ul className="space-y-3 pt-2 text-xs text-[#33413C]">
            {features.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#005C4B] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E7E2D8] p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="badge-mint text-xs">The In-Office Experience</span>
            <h3 className="text-xl font-bold text-[#162E27] font-display">
              A healthcare visit you will actually look forward to
            </h3>
            <p className="text-xs text-[#687B74] leading-relaxed">
              Forget cold, sterile waiting rooms and rushed doctors. Our offices are designed with calming organic aesthetics, natural light, complimentary tea, and zero wait times.
            </p>
            <div className="space-y-2 text-xs text-[#33413C]">
              <div className="p-3 bg-white rounded-xl border border-[#E7E2D8] flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#005C4B]" />
                <span><strong>No Waiting Room Delay:</strong> Appointments start on time.</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E7E2D8] flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#005C4B]" />
                <span><strong>On-Site Blood Labs:</strong> Complete tests during your visit.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E2D8]">
            <Link
              href="/patient/book"
              className="btn-pill-primary w-full text-center"
            >
              Schedule Your Annual Physical
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
