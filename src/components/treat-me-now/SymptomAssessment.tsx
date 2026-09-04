"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Video,
  MessageSquare,
  Thermometer,
  Activity,
  Heart,
  Clock,
  Check,
} from "lucide-react";

export interface SymptomAssessmentData {
  chiefComplaint: string;
  severityScale: number;
  duration: string;
  additionalSymptoms: string[];
  vitals?: {
    temperatureC?: string;
    systolicBp?: string;
    diastolicBp?: string;
    oxygenSaturation?: string;
  };
  careFormat: "video" | "chat";
}

interface SymptomAssessmentProps {
  initialComplaint?: string;
  onSubmit: (data: SymptomAssessmentData) => void;
  isLoading?: boolean;
}

const COMMON_SYMPTOM_TAGS = [
  "Fever / Chills",
  "Sore Throat",
  "Nasal Congestion",
  "Cough",
  "Headache",
  "Nausea / Upset Stomach",
  "Urinary Discomfort",
  "Skin Rash / Itching",
  "Fatigue",
  "Body Aches",
  "Ear Pain",
  "Eye Irritation",
];

export default function SymptomAssessment({
  initialComplaint = "",
  onSubmit,
  isLoading = false,
}: SymptomAssessmentProps) {
  const [chiefComplaint, setChiefComplaint] = useState(initialComplaint);
  const [severityScale, setSeverityScale] = useState(5);
  const [duration, setDuration] = useState("1-2 days");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [careFormat, setCareFormat] = useState<"video" | "chat">("video");
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState({
    temperatureC: "",
    systolicBp: "",
    diastolicBp: "",
    oxygenSaturation: "",
  });

  const toggleSymptom = (tag: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) return;

    onSubmit({
      chiefComplaint: chiefComplaint.trim(),
      severityScale,
      duration,
      additionalSymptoms: selectedSymptoms,
      vitals: showVitals ? vitals : undefined,
      careFormat,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {/* 1. Main Concern */}
      <div className="space-y-2">
        <label className="block text-sm font-extrabold text-white">
          1. What is your primary symptom or reason for care today? *
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="e.g. Sore throat with mild fever since yesterday, burning urination, rash on arm..."
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* 2. Severity Slider (1-10) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            2. Severity & Discomfort Level: <span className="text-teal-400 font-mono font-extrabold text-sm">{severityScale}/10</span>
          </label>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              severityScale >= 8
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : severityScale >= 5
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
            }`}
          >
            {severityScale >= 8 ? "Severe" : severityScale >= 5 ? "Moderate" : "Mild"}
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={severityScale}
          onChange={(e) => setSeverityScale(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>1 - Barely noticeable</span>
          <span>5 - Uncomfortable</span>
          <span>10 - Incapacitating</span>
        </div>
      </div>

      {/* 3. Duration */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          3. How long have you experienced these symptoms?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {["< 24 Hours", "1-3 Days", "4-7 Days", "Over 1 Week"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                duration === d
                  ? "bg-teal-500 text-slate-950 border-teal-500 shadow-md shadow-teal-900/30"
                  : "bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Associated Symptoms Tags */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          4. Any accompanying symptoms? (Select all that apply)
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOM_TAGS.map((tag) => {
            const isSelected = selectedSymptoms.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleSymptom(tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-teal-400" />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Care Visit Format */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          5. Preferred Virtual Consultation Format:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCareFormat("video")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
              careFormat === "video"
                ? "bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20 text-white"
                : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${careFormat === "video" ? "bg-teal-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Live HD Video Visit (Recommended)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Face-to-face examination with on-call doctor</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCareFormat("chat")}
            className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
              careFormat === "chat"
                ? "bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20 text-white"
                : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${careFormat === "chat" ? "bg-teal-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Secure Clinical Chat</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Messaging with optional photo attachment</div>
            </div>
          </button>
        </div>
      </div>

      {/* Optional Vitals Toggle */}
      <div className="border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => setShowVitals(!showVitals)}
          className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{showVitals ? "Hide Vital Signs" : "+ Add Home Vital Signs (Optional: BP, Temp, SpO₂)"}</span>
        </button>

        {showVitals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Temperature (°C)</label>
              <input
                type="text"
                placeholder="e.g. 38.2"
                value={vitals.temperatureC}
                onChange={(e) => setVitals({ ...vitals, temperatureC: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Systolic BP (mmHg)</label>
              <input
                type="text"
                placeholder="e.g. 120"
                value={vitals.systolicBp}
                onChange={(e) => setVitals({ ...vitals, systolicBp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Diastolic BP (mmHg)</label>
              <input
                type="text"
                placeholder="e.g. 80"
                value={vitals.diastolicBp}
                onChange={(e) => setVitals({ ...vitals, diastolicBp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">SpO₂ Oxygen (%)</label>
              <input
                type="text"
                placeholder="e.g. 98"
                value={vitals.oxygenSaturation}
                onChange={(e) => setVitals({ ...vitals, oxygenSaturation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!chiefComplaint.trim() || isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-teal-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></span>
              AI Triage Engine Analyzing Symptoms...
            </span>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Perform Rapid AI Triage & Match Doctor</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
