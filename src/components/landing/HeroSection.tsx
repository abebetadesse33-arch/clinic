"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Users, Pill } from "lucide-react";

import { HudRing } from "../hud/HudRing";

export function HeroSection() {
  return (
    <>
      <section className="relative pt-2 sm:pt-4 pb-8 sm:pb-14 px-3 sm:px-6 max-w-7xl mx-auto" aria-labelledby="home-hero-title">
        <div className="rounded-[28px] sm:rounded-[36px] border border-slate-200/90 dark:border-cyan-500/20 bg-white/95 dark:bg-slate-900/85 dark:backdrop-blur-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.6)] dark:glass dark:glass-refract p-5 sm:p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(0,240,255,0.12),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(255,0,170,0.08),transparent_45%)] pointer-events-none" />
          
          {/* Subtle background HUD Orbital Ring in Dark Mode */}
          <div className="hidden dark:block absolute -top-16 -right-16 opacity-35 pointer-events-none" aria-hidden="true">
            <HudRing size="xl" variant="orbital" color="cyan" />
          </div>

          <div className="relative z-10 text-center max-w-5xl mx-auto space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-cyan-950/60 border border-sky-200 dark:border-cyan-500/40 text-sky-800 dark:text-cyan-300 text-xs font-bold shadow-xs">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500 dark:bg-cyan-400"></span>
              <span>NiniMed Habitat Medium Clinic · Debre Birhan</span>
              <span className="hidden sm:inline-block font-ethiopic text-[0.7rem] text-amber-500/90 border-l border-amber-500/40 pl-2">ኒኒ ሜድ</span>
            </div>

            <h1 id="home-hero-title" className="text-[2.2rem] sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.08] font-serif-heading">
              Outpatient care, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#005C4B] via-teal-600 to-sky-600 dark:from-teal-400 dark:via-sky-400 dark:to-cyan-400 bg-clip-text text-transparent italic">centered on you.</span>
            </h1>

            <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Book outpatient care at our planned medium clinic in Habitat, Debre Birhan. Services and opening hours are confirmed by the clinic and depend on its approved scope.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/patient/book"
                className="min-h-11 w-full sm:w-auto text-xs sm:text-sm py-3 px-7 rounded-full bg-[#005C4B] hover:bg-[#00483B] dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-extrabold flex items-center justify-center gap-2 group shadow-md shadow-teal-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/locations"
                className="min-h-11 w-full sm:w-auto text-xs sm:text-sm py-3 px-7 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-bold border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>Clinic details & services</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-8 sm:pt-10 text-left">
              {[
                {
                  title: "Outpatient Consultations",
                  subtitle: "Primary and scheduled specialty care within approved scope",
                  icon: Users,
                  badge: "Appointments",
                },
                {
                  title: "Habitat, Debre Birhan",
                  subtitle: "One medium clinic; verify location and hours before visiting",
                  icon: MapPin,
                  badge: "Main Clinic",
                },
                {
                  title: "Diagnostics & Prevention",
                  subtitle: "Testing and immunization only where authorized and available",
                  icon: Pill,
                  badge: "Scope Dependent",
                },
                {
                  title: "Continuity & Referral",
                  subtitle: "Follow-up care and referral when a higher level of care is needed",
                  icon: Clock,
                  badge: "Patient Focused",
                },
              ].map(({ title, subtitle, icon: Icon, badge }) => (
                <div
                  key={title}
                  className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-teal-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[#005C4B]/10 dark:bg-teal-500/15 text-[#005C4B] dark:text-teal-400 flex items-center justify-center shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="badge-mint text-[9px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-display">{title}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
