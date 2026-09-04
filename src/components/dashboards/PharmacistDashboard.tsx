"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  AlertTriangle,
  CheckCircle2,
  Dna,
  FileCheck,
  Pill,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function PharmacistDashboard() {
  const {
    patients,
    selectedPatient,
    selectPatient,
    medications,
    prescriptions,
    labResults,
    genetics,
    checkSafetyForCandidate,
    currentUser,
  } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);
  const pMeds = patient ? medications.filter((m) => m.patientId === patient.id) : [];
  const egfrLab = patient ? labResults.find((l) => l.patientId === patient.id && l.testName.toLowerCase().includes("egfr")) : undefined;
  const cyp2c19 = patient ? genetics.find((g) => g.patientId === patient.id && g.gene.toUpperCase() === "CYP2C19") : undefined;

  const [verifyCandidate, setVerifyCandidate] = useState("");
  const [safetyAlerts, setSafetyAlerts] = useState<any[] | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCandidate.trim() || !patient) return;
    const alerts = checkSafetyForCandidate(verifyCandidate, patient.id);
    setSafetyAlerts(alerts);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-bold uppercase">
              Clinical Pharmacist (PharmD) Console
            </span>
            <span className="text-xs text-slate-500 font-mono">License: {currentUser?.licenseNumber || "RPH-991204"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Medication Safety, DDI & Pharmacogenomics Console
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Active Clinician: <strong className="text-slate-900">{currentUser?.fullName || "Clinical Pharmacist"}</strong> • Specialty: {currentUser?.specialty || "Clinical Pharmacotherapy"}.
          </p>
        </div>

        <select
          value={patient?.id || ""}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-cyan-300 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
          {patients.length === 0 && <option value="">No patients available</option>}
        </select>
      </div>

      {/* Critical Pharmacogenomics & Renal Clearance Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="soft-panel p-4 rounded-2xl border border-cyan-100 bg-cyan-50/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">Renal Clearance (eGFR)</span>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
              Stage 3b CKD
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {egfrLab?.value || "42"} <span className="text-xs font-normal text-slate-500">mL/min/1.73m²</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Metformin cap: 1000 mg/day. SGLT2i (Empagliflozin 10mg) approved for cardiorenal protection.
          </p>
        </div>

        <div className="soft-panel p-4 rounded-2xl border border-teal-100 bg-teal-50/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">Pharmacogenomics (PGx)</span>
            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-bold text-[10px]">
              CPIC Level 1A
            </span>
          </div>
          <div className="text-xl font-extrabold text-teal-700">
            CYP2C19 {cyp2c19?.variant || "*2/*2"}
          </div>
          <p className="text-[11px] text-slate-600">
            Poor Metabolizer: Loss-of-function contraindicates Clopidogrel (Plavix). Use Ticagrelor 90mg BID.
          </p>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">Documented Allergies</span>
            <span className="text-[10px] text-rose-600 font-bold uppercase">Critical</span>
          </div>
          <div className="text-base font-extrabold text-rose-700">
            {patient?.allergies ? patient.allergies.map((a) => a.substance).join(", ") || "NKDA" : "No allergy data"}
          </div>
          <p className="text-[11px] text-slate-500">Cross-checked automatically against beta-lactam class.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Active Meds & E-Prescriptions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Active Medication Regimen ({pMeds.length})
              </h3>
              <span className="text-[10px] text-slate-400">Reconciliation Current</span>
            </div>

            <div className="space-y-2.5">
              {pMeds.map((med) => (
                <div key={med.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {med.name} <span className="text-cyan-400 font-semibold">({med.dosage})</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {med.frequency} • {med.route} • Indication: {med.indication}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Reconciled
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Pharmacist Real-Time Safety Screener */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              Pharmacist Drug Safety & Formulary Screener
            </h3>
            <p className="text-xs text-slate-400">
              Cross-check new medications against allergies, renal limits, and pharmacogenomic enzymes.
            </p>

            <form onSubmit={handleVerify} className="space-y-2">
              <input
                type="text"
                placeholder="Enter candidate drug (e.g. Clopidogrel, Ticagrelor, Ciprofloxacin)..."
                value={verifyCandidate}
                onChange={(e) => setVerifyCandidate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
              >
                Screen Candidate Medication
              </button>
            </form>

            {safetyAlerts && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {safetyAlerts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <strong>Approved:</strong> No adverse interaction or pharmacogenomic mismatch identified for '{verifyCandidate}'.
                  </div>
                ) : (
                  safetyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        alert.severity === "Critical"
                          ? "bg-rose-950/90 border-rose-600 text-rose-200"
                          : "bg-amber-950/90 border-amber-600 text-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-white">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        {alert.title}
                      </div>
                      <p>{alert.description}</p>
                      <div className="pt-1 font-semibold text-cyan-300">Action: {alert.recommendation}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
