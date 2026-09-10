"use client";

import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustBar } from "@/components/landing/TrustBar";
import { ServiceCards } from "@/components/landing/ServiceCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhyChooseUs } from "@/components/landing/WhyChooseUs";
import { PricingCards } from "@/components/landing/PricingCards";
import { DoctorDirectory } from "@/components/landing/DoctorDirectory";
import { FAQSection } from "@/components/landing/FAQSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  ArrowRight,
  Search,
  MapPin,
  Stethoscope,
  Zap,
  FlaskConical,
  Pill,
  PhoneCall,
  Clock,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Baby,
} from "lucide-react";
import Link from "next/link";

export default function GuestLandingView() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MOBILE APP VIEW: SEAMLESS & SPACIOUS (YANGO-STYLE AIRY CARDS) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-5 px-3 pt-2 pb-10">
        {/* Top Greeting & Location Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Hello there 👋
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              What care do you need?
            </h1>
          </div>
          <Link
            href="/locations"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-[#005C4B] dark:text-teal-400" />
            <span>Addis Ababa</span>
          </Link>
        </div>

        {/* Spacious Search Bar (Just like Yango destination search) */}
        <Link
          href="/patients"
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm text-slate-400 hover:border-[#005C4B] transition-all"
        >
          <Search className="w-5 h-5 text-[#005C4B] dark:text-teal-400 shrink-0" />
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Search doctors, clinics, or symptoms...
          </span>
        </Link>

        {/* Yango-Style Spacious Care Service Tiles (2x2 Grid with generous room) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Tile 1: Doctor Visit */}
          <Link
            href="/patient/book"
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 text-[#005C4B] dark:text-teal-400 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">In-Office Doctor</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Same-day visits at 14 clinics
              </p>
            </div>
          </Link>

          {/* Tile 2: 24/7 Virtual Care */}
          <Link
            href="/services/virtual-urgent-care/triage"
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">24/7 Video Care</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Doctor call in 5 minutes
              </p>
            </div>
          </Link>

          {/* Tile 3: Diagnostic Lab Tests */}
          <Link
            href="/patient/book"
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Lab & Bloodwork</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Walk-in draws & digital results
              </p>
            </div>
          </Link>

          {/* Tile 4: Pharmacy & Prescriptions */}
          <Link
            href="/patient/book"
            className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Pill className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Rx & Pharmacy</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Same-day refills & delivery
              </p>
            </div>
          </Link>
        </div>

        {/* Nearest Clinic Live Status Card (Spacious Yango Ride Card Style) */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0B3B32] via-[#005C4B] to-[#044E40] text-white shadow-md space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Nearest Clinic Open
            </span>
            <span className="font-mono text-emerald-200 text-xs font-semibold">1.2 km away</span>
          </div>

          <div>
            <h2 className="text-base font-extrabold tracking-tight">Bole Medhanialem Center</h2>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Cameroon Street • Doctors on duty with walk-in lab & triage
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <Link
              href="/patient/book"
              className="flex-1 py-3 px-4 rounded-2xl bg-white text-[#0B3B32] font-black text-xs text-center shadow-sm hover:bg-emerald-50 transition-colors"
            >
              Book Visit Today
            </Link>
            <Link
              href="/locations"
              className="py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs text-center transition-colors"
            >
              All Offices
            </Link>
          </div>
        </div>

        {/* 24/7 Nurse Hotline One-Tap Card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                24/7 Nurse Helpline
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Free clinical guidance right now
              </span>
            </div>
          </div>
          <a
            href="tel:8886636331"
            className="py-2 px-3.5 rounded-xl bg-[#005C4B] hover:bg-[#00483B] text-white text-xs font-bold shrink-0 transition-colors"
          >
            Call
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DESKTOP VIEW: RICH EDITORIAL SECTIONS (PRESERVED FOR DESKTOP) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <main className="hidden md:block flex-1 space-y-6" id="main-content">
        <HeroSection />
        <TrustBar />
        <ServiceCards />
        <HowItWorks />
        <WhyChooseUs />
        <PricingCards />
        <DoctorDirectory />
        <FAQSection />
        <LandingFooter />
      </main>
    </div>
  );
}
