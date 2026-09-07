"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, ShieldCheck, Heart, Stethoscope, ArrowLeft, Loader2 } from "lucide-react";
import SmartRegistrationForm from "@/components/registration/SmartRegistrationForm";

export default function PatientSelfRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      }
    >
      <RegistrationContent />
    </Suspense>
  );
}

function RegistrationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || undefined;

  return (
    <div className="max-w-4xl w-full mx-auto py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Breadcrumb & Navigation helper */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>256-Bit HIPAA Certified</span>
          </div>
          <Link
            href="/signin"
            className="text-xs text-teal-400 hover:text-teal-300 font-bold border border-teal-500/30 px-3 py-1.5 rounded-xl bg-teal-500/10 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          AI Triage &amp; Immediate Physician Matching
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Patient Self-Registration &amp; Intake
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Complete your clinical intake in under 3 minutes. Our AI triage system analyzes your symptoms in real-time and routes your chart to the most appropriate certified clinician in Debre Birhan.
        </p>
      </div>

      {/* Registration Form with Token Support */}
      <SmartRegistrationForm token={token} />
    </div>
  );
}
