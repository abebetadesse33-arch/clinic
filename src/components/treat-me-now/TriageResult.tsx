"use client";

import React from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Clock,
  Activity,
} from "lucide-react";
import type { TriageResult as TriageResultType } from "@/lib/services/triage-service";

interface TriageResultProps {
  triage: TriageResultType;
  onProceed: () => void;
  onBack: () => void;
}

export default function TriageResultView({
  triage,
  onProceed,
  onBack,
}: TriageResultProps) {
  const isEmergency = triage.urgencyLevel === "emergency" || triage.isEmergency;
  const isUrgent = triage.urgencyLevel === "urgent";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Emergency Alert Banner */}
      {isEmergency && (
        <div className="p-6 rounded-3xl bg-red-500/15 border-2 border-red-500/50 space-y-4 text-red-300 animate-pulse">
          <div className="flex items-center gap-3 text-red-400 font-extrabold text-lg">
            <AlertCircle className="w-7 h-7 shrink-0 text-red-400" />
            <span>CRITICAL EMERGENCY TRIAGE ALERT</span>
          </div>
          <p className="text-sm leading-relaxed text-red-200">
            {triage.emergencyInstructions ||
              "Your symptoms indicate a potentially serious emergency requiring immediate physical evaluation."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href="tel:911"
              className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call 911 / Emergency Services Now</span>
            </a>
            <a
              href="tel:+251116812000"
              className="py-3 px-6 rounded-xl bg-slate-900 border border-red-500/40 text-red-300 hover:bg-slate-800 font-bold text-sm flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call NiniMed 24/7 Trauma Desk (+251 11 681 2000)</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Triage Summary Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                AI Clinical Decision Support
              </span>
              <h3 className="text-xl font-extrabold text-white">Triage Assessment Result</h3>
            </div>
          </div>

          <span
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide border flex items-center gap-1.5 ${
              isEmergency
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : isUrgent
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isEmergency ? "bg-red-400 animate-ping" : isUrgent ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            Urgency: {triage.urgencyLevel.toUpperCase()}
          </span>
        </div>

        {/* Triage Summary Text */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
          {triage.summary}
        </div>

        {/* Clinical Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recommended Specialty */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-4 h-4" />
              <span>Recommended Specialty</span>
            </div>
            <p className="text-sm font-bold text-white">{triage.recommendedSpecialty}</p>
            <p className="text-[11px] text-slate-400">
              Provider Role: {triage.recommendedProviderType}
            </p>
          </div>

          {/* Estimated Triage Time */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Estimated Wait Time</span>
            </div>
            <p className="text-sm font-bold text-white">{triage.estimatedTriageTime}</p>
            <p className="text-[11px] text-slate-400">
              Confidence Score: {triage.confidenceScore}%
            </p>
          </div>
        </div>

        {/* Red Flags */}
        {triage.redFlags && triage.redFlags.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Clinical Attention Markers & Red Flags</span>
            </div>
            <ul className="space-y-1">
              {triage.redFlags.map((rf, i) => (
                <li key={i} className="text-xs text-amber-200/90 flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Differentials & Suggested Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {triage.possibleDiagnoses && triage.possibleDiagnoses.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Possible Clinical Differentials:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {triage.possibleDiagnoses.map((d, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {triage.recommendedTests && triage.recommendedTests.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Suggested Diagnostics:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {triage.recommendedTests.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
        >
          Modify Symptoms
        </button>

        <button
          type="button"
          onClick={onProceed}
          className="flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal-900/40"
        >
          <span>Continue to Doctor Matching</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
