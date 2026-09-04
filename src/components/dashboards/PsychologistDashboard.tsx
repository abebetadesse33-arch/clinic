"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  Brain,
  CheckCircle2,
  HeartPulse,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smile,
  Sparkles,
  TrendingDown,
} from "lucide-react";

export default function PsychologistDashboard() {
  const { patients, selectedPatient, selectPatient, psychological, currentUser } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);
  const psych = (patient ? psychological.find((p) => p.patientId === patient.id) : null) || psychological[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold uppercase">
              Clinical Health Psychology (PsyD) Hub
            </span>
            <span className="text-xs text-slate-500 font-mono">Specialty: Health Psychology & CBT</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Psychometrics, Cognitive Behavioral Therapy & Adherence Support
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Psychologist: <strong className="text-slate-900">{currentUser?.fullName || "Clinical Psychologist"}</strong>.
          </p>
        </div>

        <select
          value={patient?.id || ""}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-purple-300 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
          {patients.length === 0 && <option value="">No patients available</option>}
        </select>
      </div>

      {/* Psychometrics Score Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">PHQ-9 Depression Index</span>
          <div className="text-2xl font-extrabold text-purple-300">
            {psych?.score || 16} <span className="text-xs font-normal text-slate-400">/ 27</span>
          </div>
          <span className="text-[10px] text-rose-300 font-semibold">{psych?.severity || "Moderately Severe"}</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Adherence Risk Level</span>
          <div className="text-2xl font-extrabold text-rose-400 capitalize">
            {psych?.adherenceRisk || "High Risk"}
          </div>
          <span className="text-[10px] text-slate-400">Executive Fatigue Driver</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Therapeutic Modality</span>
          <div className="text-base font-extrabold text-white">8-Week CBT Program</div>
          <span className="text-[10px] text-emerald-400 font-semibold">Chronic Illness Adaptation</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Behavioral Health Plan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Cognitive Behavioral Intervention Directives
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">1. Behavioral Activation for Fatigue</span>
                <p className="text-slate-300">
                  Structure small, manageable daily activities paired with enjoyable low-effort routines to counteract depressive inertia and chronic illness apathy.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">2. Medication Routine Cognitive Scaffolding</span>
                <p className="text-slate-300">
                  Mitigate executive function fatigue by pairing morning SGLT2i and ACEi ingestion directly with morning coffee or brushing teeth rather than relying on active recall.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">3. Cognitive Reframing of Chronic Disease</span>
                <p className="text-slate-300">
                  Address catastrophic thinking regarding CKD progression and diabetic complications through structured evidence-challenging worksheets.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Clinical Psych Notes */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Smile className="w-4 h-4 text-purple-400" />
              Assessment Clinical Notes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {psych?.clinicalNotes ||
                "Patient reports persistent overwhelming exhaustion and despair regarding chronic disease burden. High adherence vulnerability secondary to executive burnout. CBT scheduled bi-weekly."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
