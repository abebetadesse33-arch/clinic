"use client";

import React from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Clock,
  FlaskConical,
  Activity,
  AlertCircle,
} from "lucide-react";
import type { TriageResult } from "@/lib/services/triage-service";

interface AITriagePanelProps {
  triage: TriageResult;
}

export default function AITriagePanel({ triage }: AITriagePanelProps) {
  const isEmergency = triage.urgencyLevel === "emergency";
  const isUrgent = triage.urgencyLevel === "urgent";

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AI Triage & Urgency Analysis
            </h4>
            <div className="text-sm font-extrabold text-white">Clinical Assessment Brief</div>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase border flex items-center gap-1.5 ${
            isEmergency
              ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
              : isUrgent
              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isEmergency ? "bg-red-400" : isUrgent ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          {triage.urgencyLevel.toUpperCase()}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
        {triage.summary}
      </p>

      {/* Specialty & Timing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
            Recommended Specialty
          </span>
          <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" />
            {triage.recommendedSpecialty}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
            Estimated Wait
          </span>
          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {triage.estimatedTriageTime}
          </span>
        </div>
      </div>

      {/* Red Flags if any */}
      {triage.redFlags && triage.redFlags.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cautionary Red Flags</span>
          </div>
          <ul className="text-[11px] text-amber-200/90 pl-5 list-disc space-y-0.5">
            {triage.redFlags.map((rf, idx) => (
              <li key={idx}>{rf}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
