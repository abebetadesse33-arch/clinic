"use client";

import React from "react";
import { useClinic } from "../../context/ClinicContext";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Dna,
  FileText,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function GeneticCounselorDashboard() {
  const { patients, selectedPatient, selectPatient, genetics, currentUser } = useClinic();

  const patient = selectedPatient || (patients.length > 0 ? patients[0] : null);
  const pGen = patient ? genetics.filter((g) => g.patientId === patient.id) : [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 text-xs font-bold uppercase">
              Genetic Counselor (CGC) Workstation
            </span>
            <span className="text-xs text-slate-500 font-mono">License: {currentUser?.licenseNumber || "CGC-221940"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Genomic Variant Interpretation & Patient Counseling
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Counselor: <strong className="text-slate-900">{currentUser?.fullName || "Genetic Counselor"}</strong> • Cardiogenomics & Pharmacogenomic Guidance.
          </p>
        </div>

        <select
          value={patient?.id || ""}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-fuchsia-300 shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)]"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
          {patients.length === 0 && <option value="">No patients available</option>}
        </select>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: VCF Genomic Profile */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
                <Dna className="w-4 h-4" />
                Sequenced Pharmacogenomic Variants ({pGen.length})
              </h3>
              <span className="text-[10px] text-slate-400">Illumina TruSight PGx Assay</span>
            </div>

            <div className="space-y-3">
              {pGen.map((g) => (
                <div key={g.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-fuchsia-300">{g.gene}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{g.variant}</span>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300">
                      {g.phenotype}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{g.clinicalSignificance}</p>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    Panel: {g.sourcePanel} • Validated on {g.testedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Patient Counseling Explanations */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-fuchsia-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-fuchsia-400" />
              Patient-Friendly Genetic Explanation
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Why Clopidogrel (Plavix) is Ineffective:</span>
                <p className="text-[11px] text-slate-400">
                  "Your liver has an enzyme called CYP2C19 that activates certain blood thinners. Your genetics show you have two slow-functioning copies (*2/*2), meaning your body cannot activate standard Plavix. Your doctor is prescribing Ticagrelor instead, which works directly without needing this enzyme."
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Statin Guidance (SLCO1B1):</span>
                <p className="text-[11px] text-slate-400">
                  "You also carry an intermediate variant for statin transport, so low-to-moderate intensity statins (like Atorvastatin or Rosuvastatin) are preferred over high-dose Simvastatin to prevent muscle soreness."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
