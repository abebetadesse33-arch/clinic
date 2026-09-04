"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, HeartPulse, Clock, MapPin, Users, Pill, Zap, ShieldCheck, CheckCircle2 } from "lucide-react";
import TreatMeNowModal from "../onemedical/TreatMeNowModal";

export function HeroSection() {
  const [showTreatMeNow, setShowTreatMeNow] = useState(false);

  const scrollToSymptomChecker = () => {
    const el = document.getElementById("ada-symptom-checker");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section className="relative pt-6 pb-16 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="luxury-gradient-surface luxury-shadow rounded-[32px] border border-white/70 p-6 sm:p-8 lg:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.18),transparent_28%)]" />
          <div className="relative z-10 text-center max-w-5xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm backdrop-blur-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>24/7 Virtual Urgent Care Active · Same-Day Appointments Available</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08] font-serif-heading">
              Doctor’s appointments you might <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 bg-clip-text text-transparent italic">actually look forward to.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              From 24/7 on-demand video visits with on-call physicians to un-rushed appointments in calming, quiet offices with on-site blood labs — this is healthcare reimagined around your life.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                href="/patient/book"
                className="btn-pill-primary w-full sm:w-auto text-sm py-4 px-8 flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/20"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button
                type="button"
                onClick={() => setShowTreatMeNow(true)}
                className="btn-pill-secondary w-full sm:w-auto text-sm py-4 px-8 shadow-md shadow-slate-200"
              >
                <Zap className="w-4 h-4" />
                <span>Treat Me Now™ (24/7 Virtual)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-10 text-left">
              {[
                {
                  title: "24/7 On-Demand Care",
                  subtitle: "Video chat with a provider in minutes, day or night",
                  icon: Clock,
                  badge: "Zero Wait",
                },
                {
                  title: "Same-Day In-Office",
                  subtitle: "Drop into beautifully calming offices with no wait times",
                  icon: MapPin,
                  badge: "14 Locations",
                },
                {
                  title: "In-House Lab Services",
                  subtitle: "Routine bloodwork, tests, and vaccines done on-site",
                  icon: Pill,
                  badge: "Fast Results",
                },
                {
                  title: "Salaried Physicians",
                  subtitle: "Doctors spend 2x more time with you, never rushed",
                  icon: Users,
                  badge: "Un-rushed Care",
                },
              ].map(({ title, subtitle, icon: Icon, badge }) => (
                <div
                  key={title}
                  className="glass-card p-5 rounded-2xl hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700 flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="badge-mint text-[10px]">{badge}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 font-display">{title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showTreatMeNow && <TreatMeNowModal onClose={() => setShowTreatMeNow(false)} />}
    </>
  );
}
