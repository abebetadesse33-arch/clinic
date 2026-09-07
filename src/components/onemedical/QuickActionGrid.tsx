"use client";

import React from "react";
import Link from "next/link";
import { Calendar, Zap, Pill, FlaskConical, ArrowRight, Video, Clock, Sparkles } from "lucide-react";

export default function QuickActionGrid() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Book an Appointment */}
        <Link
          href="/patient/book"
          className="group relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-500 hover:shadow-warm transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                In-Person & Video
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Book a Visit
            </h3>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              Same-day & next-day slots with your primary doctor or specialist.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
            <span>Find a time</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 2. Treat Me Now (24/7 Virtual Urgent Care) */}
        <Link
          href="/services/virtual-urgent-care/triage"
          className="group relative text-left bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 text-white rounded-2xl p-5 border border-sky-400/40 shadow-lg shadow-sky-600/20 hover:shadow-warm-md transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/15 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform backdrop-blur-sm">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                24/7 Virtual Care
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-300"></span>
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-display">
              Treat Me Now
            </h3>
            <p className="text-xs text-sky-100/90 mt-1 line-clamp-2">
              Instant on-demand triage & video visits for flu, UTI, rashes, and urgent symptoms.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-sky-100">
            <span>Start triage (0 min wait)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 3. Submit Health Case */}
        <Link
          href="/patient/submit-case"
          className="group relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-500 hover:shadow-warm transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500" /> AI CDSS Intake
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Submit Health Case
            </h3>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              Submit detailed symptoms, uploads & audio memo for instant multimodal AI pre-analysis.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
            <span>Start case intake</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 4. Renew a Prescription & Labs */}
        <Link
          href="/patient/health?tab=prescriptions"
          className="group relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-500 hover:shadow-warm transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#FEF7E6] text-[#B8801C] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Pill className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B8801C] bg-[#FEF7E6] px-2.5 py-0.5 rounded-full">
                1-Click Refills & Labs
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Prescriptions & Labs
            </h3>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              Manage active medications, view diagnostic reports, and order refills.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
            <span>Manage health</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

    </>
  );
}
