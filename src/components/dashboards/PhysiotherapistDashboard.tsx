"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Footprints,
  HeartPulse,
  Plus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function PhysiotherapistDashboard() {
  const { patients, selectedPatient, selectPatient, physiotherapyAssessments, currentUser } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);
  const ptAssessment = (patient ? physiotherapyAssessments.find((p) => p.patientId === patient.id) : null) || physiotherapyAssessments[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase">
              Physical Therapy & Rehabilitation Studio
            </span>
            <span className="text-xs text-slate-500 font-mono">License: {currentUser?.licenseNumber || "PT-441209"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Rehabilitation, Berg Balance & Exercise Prescription
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Therapist: <strong className="text-slate-900">{currentUser?.fullName || "Physical Therapist"}</strong> • Specialty: Cardiopulmonary & Geriatric Rehab.
          </p>
        </div>

        <select
          value={patient?.id || ""}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-emerald-300 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
          {patients.length === 0 && <option value="">No patients available</option>}
        </select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="soft-panel p-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Berg Balance Scale</span>
          <div className="text-2xl font-extrabold text-slate-900">
            {ptAssessment?.bergBalanceScore || 42} <span className="text-xs font-normal text-slate-500">/ 56</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block">Medium Fall Risk • Balance Training Indicated</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Gait Speed</span>
          <div className="text-2xl font-extrabold text-slate-900">
            {ptAssessment?.gaitSpeedMetersPerSec || "0.92"} <span className="text-xs font-normal text-slate-500">m/s</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Functional Community Ambulation Range</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Functional Mobility Status</span>
          <div className="text-base font-extrabold text-teal-700">
            {ptAssessment?.mobilityStatus || "Independent with Countertop Balance"}
          </div>
          <span className="text-[11px] text-slate-500 block">Target: Unassisted tandem walking</span>
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
