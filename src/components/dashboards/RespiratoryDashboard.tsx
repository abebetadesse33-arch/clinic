"use client";

import React from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Plus,
  ShieldCheck,
  Wind,
} from "lucide-react";

export default function RespiratoryDashboard() {
  const { patients, selectedPatient, selectPatient, currentUser } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold uppercase">
              Respiratory Therapy (RRT) Workstation
            </span>
            <span className="text-xs text-slate-500 font-mono">License: {currentUser?.licenseNumber || "RRT-882193"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Pulmonary Diagnostics, ABG & Airway Care
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Therapist: <strong className="text-slate-900">{currentUser?.fullName || "Respiratory Therapist"}</strong> • Adult Critical Care & Pulmonary Diagnostics.
          </p>
        </div>

        <select
          value={patient?.id || ""}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-300 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
          {patients.length === 0 && <option value="">No patients available</option>}
        </select>
      </div>

      {/* ABG Parameter Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card p-3 rounded-2xl border border-slate-800 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Arterial pH</span>
          <div className="text-xl font-extrabold text-emerald-400">7.38</div>
          <span className="text-[9px] text-slate-500">Normal (7.35 - 7.45)</span>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-slate-800 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">PaCO2</span>
          <div className="text-xl font-extrabold text-white">41 <span className="text-xs font-normal text-slate-400">mmHg</span></div>
          <span className="text-[9px] text-slate-500">Normal (35 - 45)</span>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-slate-800 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">PaO2</span>
          <div className="text-xl font-extrabold text-white">88 <span className="text-xs font-normal text-slate-400">mmHg</span></div>
          <span className="text-[9px] text-slate-500">Normal (80 - 100)</span>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-slate-800 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">HCO3-</span>
          <div className="text-xl font-extrabold text-white">24 <span className="text-xs font-normal text-slate-400">mEq/L</span></div>
          <span className="text-[9px] text-slate-500">Normal (22 - 26)</span>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-sky-500/30 bg-sky-950/20 text-center space-y-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">SaO2 (Room Air)</span>
          <div className="text-xl font-extrabold text-sky-300">97%</div>
          <span className="text-[9px] text-sky-400">Adequate Oxygenation</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Airway Directives */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Respiratory Therapy & Airway Care Directives
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Auscultation Follow-Up</span>
                <p className="text-slate-300">
                  Fine end-inspiratory crackles heard at bilateral lung bases. Recommended to re-assess breath sounds 1 hour post-diuresis or standing exercise.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Incentive Spirometry Protocol</span>
                <p className="text-slate-300">
                  Prescribe 10 sustained maximal inspirations per hour while awake (target: 1,250 mL) to prevent atelectasis during periods of fatigue.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Spirometry / PFT Values */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-sky-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Pulmonary Function Test (PFT)
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">FEV1:</span>
                <span className="font-bold text-white">2.65 L (86% predicted)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">FVC:</span>
                <span className="font-bold text-white">3.20 L (89% predicted)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">FEV1/FVC Ratio:</span>
                <span className="font-bold text-emerald-400">82.8% (Non-obstructive)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
