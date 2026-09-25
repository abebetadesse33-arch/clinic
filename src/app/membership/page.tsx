"use client";

import React from "react";
import Link from "next/link";
import { MapPin, CalendarClock, CircleHelp } from "lucide-react";

export default function MembershipPage() {
  return (
    <div className="space-y-10 py-6">
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 sm:p-12 shadow-warm text-center max-w-3xl mx-auto space-y-5">
        <span className="badge-mint text-xs">Habitat Medium Clinic</span>
        <h1 className="text-3xl sm:text-5xl font-bold text-[#162E27] font-serif-heading leading-tight">
          Clinic services and fees
        </h1>
        <p className="text-xs sm:text-sm text-[#687B74] leading-relaxed">
          NiniMed Habitat is planned as a medium-size outpatient clinic. Please confirm current services, appointment availability, clinic hours, fees, and accepted payment methods before visiting.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 text-left pt-2">
          <div className="rounded-2xl border border-[#E7E2D8] p-4 flex gap-3">
            <CalendarClock className="w-5 h-5 text-sky-600 shrink-0" />
            <p className="text-xs text-[#687B74]">Opening hours and provider schedules are confirmed by the clinic.</p>
          </div>
          <div className="rounded-2xl border border-[#E7E2D8] p-4 flex gap-3">
            <CircleHelp className="w-5 h-5 text-sky-600 shrink-0" />
            <p className="text-xs text-[#687B74]">Laboratory, pharmacy, and other ancillary services depend on separate approval and availability.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link href="/locations" className="btn-pill-secondary text-xs py-2.5 px-5 inline-flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> Clinic location & services
          </Link>
          <Link href="/patient/book" className="btn-pill-primary text-xs py-2.5 px-5">
            Request an appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
