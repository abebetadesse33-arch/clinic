"use client";

import React from "react";
import { ShieldCheck, Award, Star, Building2, Stethoscope, Lock, HeartHandshake } from "lucide-react";

export function TrustBar() {
  return (
    <section className="py-8 px-4 sm:px-8 max-w-7xl mx-auto border-y border-[#E7E2D8] bg-white rounded-2xl my-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left Trust Statement */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#162E27] uppercase tracking-wider">
              Exceptional, Accredited Care
            </div>
            <div className="text-xs text-[#687B74]">
              Top-rated clinical team with 98.4% patient satisfaction
            </div>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <span className="text-2xl font-bold text-[#162E27] font-display">10,000+</span>
            <span className="text-[11px] text-[#687B74] block font-medium mt-0.5">Active Members</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-sky-600 font-display">4.9 ★</span>
            <span className="text-[11px] text-[#687B74] block font-medium mt-0.5">Average Rating</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-[#D96B43] font-display">&lt; 3 mins</span>
            <span className="text-[11px] text-[#687B74] block font-medium mt-0.5">Virtual Triage Wait</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-[#162E27] font-display">HIPAA</span>
            <span className="text-[11px] text-[#687B74] block font-medium mt-0.5">SOC-2 Certified</span>
          </div>
        </div>
      </div>
    </section>
  );
}
