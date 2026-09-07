"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";

export default function AppFooter() {
  const pathname = usePathname();
  const { isGuest } = useClinic();

  // If on home landing page and user is guest, GuestLandingView already renders LandingFooter
  if (pathname === "/" && isGuest) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200/80 bg-white/80 py-6 mt-auto hidden md:block backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-600 gap-4 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#14b8a6] animate-pulse"></span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">NiniMed Clinical Network</span>
          <span>•</span>
          <span>Care designed around your life</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <Link href="/services/primary-care" className="hover:text-teal-600 transition-colors dark:hover:text-emerald-300">Primary Care</Link>
          <span>•</span>
          <Link href="/services/virtual-urgent-care/triage" className="hover:text-teal-600 transition-colors dark:hover:text-emerald-300">24/7 Virtual Triage</Link>
          <span>•</span>
          <Link href="/locations" className="hover:text-teal-600 transition-colors dark:hover:text-emerald-300">Find an Office</Link>
          <span>•</span>
          <Link href="/membership" className="hover:text-teal-600 transition-colors dark:hover:text-emerald-300">Membership & Insurance</Link>
          <span>•</span>
          <span className="text-slate-400 dark:text-slate-500">HIPAA & SOC-2 Certified</span>
        </div>
      </div>
    </footer>
  );
}
