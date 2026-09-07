"use client";

import React from "react";
import CareTeamChat from "@/components/onemedical/CareTeamChat";
import { MessageSquare, ShieldCheck, Clock, PhoneCall } from "lucide-react";

export default function PatientMessagesPage() {
  return (
    <div className="space-y-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="badge-mint text-xs">Direct Care Messaging</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading mt-0.5">
            Care Team Inbox
          </h1>
          <p className="text-xs text-[#687B74]">
            Message your dedicated primary doctor and triage nursing team.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#687B74]">
          <Clock className="w-4 h-4 text-[#005C4B]" />
          <span>Average response: <strong>Under 4 hours</strong></span>
        </div>
      </div>

      {/* Chat Component */}
      <CareTeamChat />

      {/* Triage Disclaimer */}
      <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#687B74] flex items-center justify-between">
        <span>For urgent concerns after hours, use <strong>Treat Me Now™</strong> or call our 24/7 Nurse Hotline.</span>
        <a href="/patient/treat-me-now" className="text-[#005C4B] font-bold hover:underline">
          Launch Treat Me Now →
        </a>
      </div>
    </div>
  );
}
