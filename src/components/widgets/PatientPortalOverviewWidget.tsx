"use client";

import React, { useState } from "react";
import type { WidgetProps } from "./WidgetRegistry";
import { useClinic } from "@/context/ClinicContext";
import { Heart, Pill, Calendar, FileText, MessageCircle, Bell, ChevronRight, Activity } from "lucide-react";

const MY_APPOINTMENTS = [
  { id: "apt-01", type: "Primary Care Follow-up", doctor: "Dr. Sarah Mitchell, MD", date: "2026-09-02", time: "10:30 AM", location: "Room 412", status: "confirmed" },
  { id: "apt-02", type: "Nephrology Consult", doctor: "Dr. R. Kapoor, MD", date: "2026-09-10", time: "2:00 PM", location: "Kidney Clinic", status: "confirmed" },
  { id: "apt-03", type: "Dietitian Session", doctor: "Maya Lin, MS, RD", date: "2026-09-05", time: "11:00 AM", location: "Nutrition Suite", status: "confirmed" },
];

const MY_RESULTS = [
  { id: "res-01", name: "HbA1c", value: "8.9%", date: "2026-08-20", status: "high" as const, note: "Goal < 7.5% — discuss with Dr. Mitchell" },
  { id: "res-02", name: "eGFR", value: "52 mL/min", date: "2026-08-20", status: "low" as const, note: "Kidney function — stable from last check" },
  { id: "res-03", name: "Blood Pressure", value: "158/97", date: "2026-08-24", status: "high" as const, note: "Goal < 130/80 — medication may be adjusted" },
  { id: "res-04", name: "Potassium", value: "4.2 mEq/L", date: "2026-08-20", status: "normal" as const, note: "Normal range" },
];

const MY_MEDS = [
  { name: "Empagliflozin 10mg", frequency: "Once daily, morning", instruction: "Take with or without food" },
  { name: "Metformin 500mg", frequency: "Twice daily", instruction: "Take with meals to reduce stomach upset" },
  { name: "Lisinopril 10mg", frequency: "Once daily, morning", instruction: "Blood pressure medication" },
  { name: "Atorvastatin 40mg", frequency: "Once nightly", instruction: "Cholesterol medication, take at bedtime" },
];

const RESULT_COLORS = {
  high: "text-red-400 bg-red-500/10 border-red-500/25",
  low: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  normal: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
};

export default function PatientPortalOverviewWidget({ title }: WidgetProps) {
  const { selectedPatient } = useClinic();
  const [activeTab, setActiveTab] = useState<"summary" | "results" | "medications" | "appointments">("summary");

  const TABS = [
    { id: "summary", label: "Summary", icon: Heart },
    { id: "results", label: "Results", icon: Activity },
    { id: "medications", label: "Medications", icon: Pill },
    { id: "appointments", label: "Appointments", icon: Calendar },
  ] as const;

  return (
    <div className="widget-shell h-full flex flex-col">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-pink-400" />
          <span className="widget-title">My Health — {selectedPatient?.firstName ?? "Patient"}</span>
        </div>
        <button className="toolbar-btn">
          <Bell size={14} />
        </button>
      </div>

      {/* Welcome Banner */}
      {activeTab === "summary" && (
        <div className="mx-4 mt-2 p-3 rounded-lg bg-gradient-to-r from-pink-500/15 to-violet-500/15 border border-pink-500/20">
          <p className="text-sm font-semibold text-white">
            Good morning, {selectedPatient?.firstName ?? "Eleanor"} 👋
          </p>
          <p className="text-xs text-white/60 mt-0.5">
            Your next appointment is in 9 days. You have 1 new lab result.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 mt-2 gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 text-xs py-2 px-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id ? "border-pink-400 text-pink-400" : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      <div className="widget-body flex-1 overflow-y-auto">
        {/* Summary */}
        {activeTab === "summary" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border border-white/8 bg-white/3 text-center">
                <div className="text-2xl font-bold text-white">{MY_MEDS.length}</div>
                <div className="text-xs text-white/40">Medications</div>
              </div>
              <div className="p-3 rounded-lg border border-white/8 bg-white/3 text-center">
                <div className="text-2xl font-bold text-white">{MY_APPOINTMENTS.length}</div>
                <div className="text-xs text-white/40">Upcoming Visits</div>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs font-semibold text-amber-300 mb-1">⚠️ Action Needed</p>
              <p className="text-xs text-white/70">Your HbA1c (8.9%) is above your goal of 7.5%. Please discuss medication adjustment at your next visit.</p>
            </div>
            <div className="p-3 rounded-lg border border-white/8 bg-white/3">
              <p className="text-xs font-semibold text-white/60 mb-2">📋 Care Goals</p>
              {[
                { goal: "Blood Sugar Control", target: "HbA1c < 7.5%", current: "8.9% — needs improvement", ok: false },
                { goal: "Blood Pressure", target: "< 130/80 mmHg", current: "158/97 — needs improvement", ok: false },
                { goal: "Kidney Health", target: "eGFR stable", current: "52 — stable this quarter", ok: true },
                { goal: "Cholesterol", target: "LDL < 70 mg/dL", current: "On medication", ok: true },
              ].map((item) => (
                <div key={item.goal} className="flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
                  <span className={`text-sm ${item.ok ? "text-emerald-400" : "text-amber-400"}`}>{item.ok ? "✓" : "!"}</span>
                  <div>
                    <span className="text-xs font-medium text-white">{item.goal}</span>
                    <div className="text-[10px] text-white/40">{item.current}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {activeTab === "results" && (
          <div className="space-y-2">
            {MY_RESULTS.map((result) => (
              <div key={result.id} className={`p-3 rounded-lg border ${RESULT_COLORS[result.status]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{result.name}</span>
                  <span className={`text-lg font-bold ${result.status === "high" ? "text-red-400" : result.status === "low" ? "text-amber-400" : "text-emerald-400"}`}>
                    {result.value}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-white/50">{result.note}</p>
                  <span className="text-[10px] text-white/30">{result.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Medications */}
        {activeTab === "medications" && (
          <div className="space-y-2">
            <p className="text-xs text-white/40 pb-1">Your current prescription list — always take medications as directed.</p>
            {MY_MEDS.map((med) => (
              <div key={med.name} className="p-3 rounded-lg border border-white/8 bg-white/3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{med.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">{med.frequency}</p>
                    <p className="text-xs text-white/40 mt-0.5 italic">{med.instruction}</p>
                  </div>
                  <Pill size={14} className="text-white/20 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Appointments */}
        {activeTab === "appointments" && (
          <div className="space-y-2">
            {MY_APPOINTMENTS.map((apt) => (
              <div key={apt.id} className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{apt.type}</p>
                    <p className="text-xs text-white/60 mt-0.5">{apt.doctor}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                      <Calendar size={10} />
                      <span>{apt.date} at {apt.time}</span>
                    </div>
                    <span className="text-[10px] text-white/30">{apt.location}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    Confirmed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
