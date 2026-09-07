"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useClinic } from "../../context/ClinicContext";
import IncomingBookingPanel from "./IncomingBookingPanel";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  HeartPulse,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  UserCheck,
  X,
} from "lucide-react";

export default function NurseDashboard() {
  const { patients, vitals, medications, nursingAssessments, currentUser } = useClinic();

  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || "");
  const [systolic, setSystolic] = useState(135);
  const [diastolic, setDiastolic] = useState(85);
  const [hr, setHr] = useState(76);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(36.7);
  const [glucose, setGlucose] = useState(128);

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    setShowVitalsModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="minimal-dashboard-shell p-5 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold uppercase">
              Registered Nursing (RN) Workstation
            </span>
            <span className="text-xs text-slate-500 font-mono">License: {currentUser?.licenseNumber || "RN-552194"}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Nursing Care Directives & Vitals Monitoring
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Shift Nurse: <strong className="text-slate-900">{currentUser?.fullName || "Shift Nurse"}</strong> • Department: Cardiometabolic Unit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/appointments"
            className="px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_10px_26px_-20px_rgba(15,23,42,0.22)] hover:bg-white"
          >
            <Activity className="w-4 h-4 text-rose-500" />
            Appointments
          </Link>
          <button
            onClick={() => setShowVitalsModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/80 border border-rose-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_10px_26px_-20px_rgba(244,63,94,0.22)] hover:bg-white"
          >
            <Plus className="w-4 h-4 text-rose-500" />
            Record Patient Vitals
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Shift Assigned Patients</span>
          <div className="text-2xl font-extrabold text-slate-900">{patients.length}</div>
          <span className="text-[10px] text-teal-600 font-semibold">All Vitals Recorded Today</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl border border-amber-100 bg-amber-50/80 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Fall Risk Precautions</span>
          <div className="text-2xl font-extrabold text-amber-600">1</div>
          <span className="text-[10px] text-amber-700 font-semibold">Morse Score: 45 (Moderate)</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Medication Doses Due (MAR)</span>
          <div className="text-2xl font-extrabold text-slate-900">3</div>
          <span className="text-[10px] text-slate-500">Morning SGLT2i & ACEi</span>
        </div>

        <div className="soft-panel p-4 rounded-2xl border border-rose-100 bg-rose-50/80 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Fluid Balance / Edema</span>
          <div className="text-2xl font-extrabold text-rose-600">1+</div>
          <span className="text-[10px] text-rose-600">Bilateral Ankle Edema</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Shift Medication Administration Record (MAR) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Shift Medication Administration Record (MAR)
              </h3>
              <span className="text-[10px] text-slate-400">Morning Round (08:00 - 10:00)</span>
            </div>

            <div className="space-y-3">
              {(() => {
                const activePat = patients.find((p) => p.id === selectedPatientId) || patients[0];
                const activePatName = activePat ? `${activePat.firstName} ${activePat.lastName}` : "Patient";
                return [
                  { name: "Empagliflozin (Jardiance)", dose: "10 mg", freq: "Once daily with breakfast", time: "08:00 AM", status: "Administered", patient: activePatName },
                  { name: "Lisinopril", dose: "20 mg", freq: "Once daily in morning", time: "08:00 AM", status: "Administered", patient: activePatName },
                  { name: "Metformin HCl", dose: "500 mg", freq: "Twice daily with meals", time: "08:30 AM", status: "Administered", patient: activePatName },
                ].map((mar, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{mar.name}</span>
                        <span className="text-rose-400 font-semibold">{mar.dose}</span>
                        <span className="text-[10px] text-slate-400">• {mar.patient}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{mar.freq} • Scheduled: {mar.time}</p>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {mar.status}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Incoming Bookings, Nursing Protocols & Patient Education */}
        <div className="lg:col-span-5 space-y-4">
          <IncomingBookingPanel clinicianId={currentUser?.id || ""} />

          <div className="glass-card p-5 rounded-2xl border border-rose-500/30 bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <Droplets className="w-4 h-4 text-rose-400" />
              SGLT2i Hydration & Nursing Directives
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="font-bold text-white block">Hydration Protocol</span>
                <p className="text-[11px] text-slate-400">Ensure patient consumes at least 1,500-2,000 mL water daily to prevent dehydration and orthostatic hypotension.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="font-bold text-white block">Mycotic Infection Hygiene</span>
                <p className="text-[11px] text-slate-400">Educate on perineal hygiene to mitigate genital mycotic infection risk inherent to glucosuria.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                <span className="font-bold text-white block">Diabetic Foot Care Inspection</span>
                <p className="text-[11px] text-slate-400">Daily visual inspection of bilateral feet for pressure erythema or microabrasions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                Record Physiological Vitals
              </h2>
              <button onClick={() => setShowVitalsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(parseInt(e.target.value) || 120)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={hr}
                    onChange={(e) => setHr(parseInt(e.target.value) || 72)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(parseInt(e.target.value) || 98)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(parseFloat(e.target.value) || 36.8)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Fasting Capillary Glucose (mg/dL)</label>
                <input
                  type="number"
                  value={glucose}
                  onChange={(e) => setGlucose(parseInt(e.target.value) || 100)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVitalsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold"
                >
                  Save Shift Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
