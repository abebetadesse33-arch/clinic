"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Zap, Video, Clock, ShieldCheck, CheckCircle2, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";
import TreatMeNowModal from "@/components/onemedical/TreatMeNowModal";

export default function VirtualUrgentCarePage() {
  const [showTreatMeNow, setShowTreatMeNow] = useState(false);

  const urgentSymptoms = [
    { title: "Colds, Flu, Fever & COVID-19", icon: "🤧" },
    { title: "Urinary Tract Infections (UTI)", icon: "💧" },
    { title: "Skin Rashes, Hives & Bug Bites", icon: "🩹" },
    { title: "Sinus Pressure & Seasonal Allergies", icon: "🌸" },
    { title: "Mild Stomach Pain, Nausea & Acid Reflux", icon: "🍵" },
    { title: "Pink Eye & Minor Eye Irritations", icon: "👁️" },
    { title: "Emergency Medication Bridge Refills", icon: "💊" },
    { title: "Sprains, Minor Back Pain & Muscle Pulls", icon: "🏃" },
  ];

  return (
    <div className="space-y-12 py-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B3B32] to-[#005C4B] text-white rounded-3xl p-8 sm:p-12 shadow-warm-lg">
        <div className="max-w-3xl space-y-5">
          <span className="badge-mint text-xs text-[#005C4B] bg-white">
            24/7 Virtual Urgent Care
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-white font-serif-heading leading-tight">
            Treat Me Now™ — Care in under 3 minutes, 24 hours a day
          </h1>
          <p className="text-sm sm:text-base text-[#E8F4F0]/85 leading-relaxed">
            No appointment needed. When you feel sick or need quick medical advice, connect instantly with our on-call physicians from your phone or laptop.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
            <button
              onClick={() => setShowTreatMeNow(true)}
              className="btn-pill-terracotta w-full sm:w-auto text-sm py-4 px-8 shadow-warm"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Launch 24/7 Virtual Triage</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-[#E8F4F0]/80">
              <Clock className="w-4 h-4 text-[#E5A93C]" />
              <span>Current wait: <strong>Under 3 minutes</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Symptoms Treated */}
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 sm:p-10 space-y-6">
        <div>
          <span className="badge-mint text-xs">Common Conditions</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading mt-1">
            What we treat virtually 24/7
          </h2>
          <p className="text-xs text-[#687B74] mt-1">
            Our board-certified clinicians can diagnose, treat, and prescribe medication electronically right away.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {urgentSymptoms.map((s, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center gap-3"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-bold text-[#162E27]">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Treat Me Now Modal */}
      {showTreatMeNow && <TreatMeNowModal onClose={() => setShowTreatMeNow(false)} />}
    </div>
  );
}
