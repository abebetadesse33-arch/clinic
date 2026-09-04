"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import AppointmentBookingWizard from "@/components/onemedical/AppointmentBookingWizard";
import { ShieldCheck, PhoneCall, LogIn, Lock } from "lucide-react";
import Link from "next/link";

export default function BookAppointmentPage() {
  const { isGuest, currentRole } = useClinic();
  const router = useRouter();

  return (
    <RoleGuard
      allowedRoles={[
        "patient",
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Sign In to Book Appointment"
      fallbackMessage="Appointment booking requires a verified patient or healthcare provider account. Please sign in to choose your provider, schedule in-person or video visits, and manage care records."
    >
      <div className="space-y-8 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="badge-mint text-xs">Schedule a Visit</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#162E27] font-serif-heading">
            Book an appointment
          </h1>
          <p className="text-xs sm:text-sm text-[#687B74] max-w-md mx-auto">
            Choose between an in-person clinic visit or a scheduled video visit with your primary provider.
          </p>
        </div>

        {/* Booking Wizard */}
        <AppointmentBookingWizard />

        {/* Trust & Guarantee Banner */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E2D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#687B74]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#005C4B] shrink-0" />
            <span>Billed directly to major insurance plans or covered by your membership.</span>
          </div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-[#005C4B]" />
            <span>Need help? Call <strong>(888) 663-6331</strong></span>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

