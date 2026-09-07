"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";

export default function PhysiotherapyPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physiotherapist",
        "occupational_therapist",
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Physical Therapy & Rehabilitation Studio"
      fallbackMessage="Access to functional mobility scoring and exercise prescription suites is restricted to licensed physical/occupational therapists and clinical rehabilitation staff."
    >
      <PhysiotherapyContent />
    </RoleGuard>
  );
}

function PhysiotherapyContent() {
  const { patients, selectedPatient, selectPatient, physiotherapyAssessments, currentUser } = useClinic();

  const patient = selectedPatient || patients[0];
  const ptAssessment = physiotherapyAssessments.find((p) => p.patientId === patient.id) || physiotherapyAssessments[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase">
              Physical Therapy & Rehabilitation Studio
            </span>
            <span className="text-xs text-slate-400 font-mono">MRN: {patient.mrn}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Physiotherapy Assessment & Exercise Prescription
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Functional mobility, Berg balance score, and cardiopulmonary progressive resistance conditioning.
          </p>
        </div>

        <select
          value={patient.id}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
        </select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Berg Balance Scale</span>
          <div className="text-2xl font-extrabold text-white">
            {ptAssessment?.bergBalanceScore || 42} <span className="text-xs font-normal text-slate-400">/ 56</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold block">Medium Fall Risk • Balance Training Indicated</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Gait Speed</span>
          <div className="text-2xl font-extrabold text-white">
            {ptAssessment?.gaitSpeedMetersPerSec || "0.92"} <span className="text-xs font-normal text-slate-400">m/s</span>
          </div>
          <span className="text-[11px] text-slate-400 block">Functional Community Ambulation Range</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Functional Mobility Status</span>
          <div className="text-base font-extrabold text-teal-300">
            {ptAssessment?.mobilityStatus || "Independent with Countertop Balance"}
          </div>
          <span className="text-[11px] text-slate-400 block">Target: Unassisted tandem walking</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Prescribed Exercise Plan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Prescribed Physical Therapy Regimen
              </h3>
              <span className="text-[10px] text-slate-400">{ptAssessment?.exercisePlan?.frequency || "4-5 sessions/week"}</span>
            </div>

            <div className="space-y-3">
              {/* Aerobic */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <HeartPulse className="w-3.5 h-3.5" /> Aerobic Conditioning
                  </span>
                  <span className="text-[10px] text-slate-400">20-30 min/day</span>
                </div>
                <p className="text-xs text-slate-300">
                  {ptAssessment?.exercisePlan?.aerobicRegimen ||
                    "Low-impact recumbent stationary cycling or brisk walking (RPE 4-5/10). Maintains cardiovascular fitness without joint impact."}
                </p>
              </div>

              {/* Resistance */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-teal-300">
                    <Dumbbell className="w-3.5 h-3.5" /> Progressive Resistance Training
                  </span>
                  <span className="text-[10px] text-slate-400">3x weekly</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                  {ptAssessment?.exercisePlan?.resistanceExercises?.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  )) || (
                    <>
                      <li>Seated knee extensions with green resistance band (2 sets x 10 reps)</li>
                      <li>Wall push-ups for scapular stability and upper body strength (2 sets x 8 reps)</li>
                      <li>Sit-to-stand transitions from 18-inch chair (2 sets x 10 reps)</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Balance */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Footprints className="w-3.5 h-3.5" /> Balance & Fall Prevention
                  </span>
                  <span className="text-[10px] text-slate-400">Daily 10 min</span>
                </div>
                <p className="text-xs text-slate-300">
                  {ptAssessment?.exercisePlan?.balanceTraining ||
                    "Tandem stance, single-leg balancing with countertop support, and side-stepping drills to improve proprioception."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Muscle Strength Grading */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Manual Muscle Testing (MMT) Summary
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { group: "Bilateral Quadriceps", grade: "4/5", note: "Good against resistance; mild fatigue" },
                { group: "Hamstrings", grade: "4/5", note: "Functional strength preserved" },
                { group: "Ankle Dorsiflexors", grade: "4/5", note: "No foot drop detected" },
                { group: "Gluteus Medius", grade: "3+/5", note: "Mild lateral pelvic sway on ambulation" },
              ].map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{m.group}</span>
                    <span className="text-[10px] text-slate-400">{m.note}</span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-emerald-400 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {m.grade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
