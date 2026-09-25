"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, HeartPulse } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="hidden md:block border-t border-sky-200/50 bg-[#0C2B4E] text-white pt-16 pb-12 px-4 sm:px-8 max-w-7xl mx-auto rounded-t-3xl mt-12 shadow-2xl shadow-sky-950/40">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 text-xs">
        {/* Column 1: Brand & Contact */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-sky-600 flex items-center justify-center font-bold shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight font-display">
              NiniMed Habitat Clinic
            </span>
          </div>
          <p className="text-sky-100/80 text-xs leading-relaxed max-w-sm">
            Outpatient care at the planned medium clinic in Habitat, Debre Birhan. Confirm current services, location, hours, and fees with the clinic.
          </p>
        </div>

        {/* Column 2: Care Services */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 block">Services</span>
          <ul className="space-y-2 text-sky-100/80">
            <li><Link href="/services/primary-care" className="hover:text-white transition-colors">Primary Care</Link></li>
            <li><Link href="/patient/book" className="hover:text-white transition-colors">Specialist Consultations</Link></li>
            <li><Link href="/patient/book" className="hover:text-white transition-colors">Chronic Disease Care</Link></li>
            <li><Link href="/locations" className="hover:text-white transition-colors">Clinic services & location</Link></li>
          </ul>
        </div>

        {/* Column 3: Membership */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 block">Patient information</span>
          <ul className="space-y-2 text-sky-100/80">
            <li><Link href="/locations" className="hover:text-white transition-colors">Clinic Locations</Link></li>
            <li><Link href="/patient/book" className="hover:text-white transition-colors">Request an appointment</Link></li>
          </ul>
        </div>

        {/* Column 4: Compliance & Certifications */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 block">Before your visit</span>
          <ul className="space-y-2 text-sky-100/80 text-[11px]">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Confirm clinic hours</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Ask about current fees</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Verify service availability</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Emergency care: visit a hospital</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-sky-100/60">
        <p>© 2026 NiniMed Habitat Clinic. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/patient/submit-case" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/patient/submit-case" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/patient/submit-case" className="hover:text-white transition-colors">Privacy information</Link>
        </div>
      </div>
    </footer>
  );
}
