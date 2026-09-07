"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Heart,
  Droplet,
  AlertTriangle,
  Pill,
  FlaskConical,
  Activity,
  FileText,
  MapPin,
  Clock,
  Printer,
  Lock,
  CheckCircle2,
  Calendar,
  Phone,
  User,
  Sparkles,
  Loader2,
  Key,
} from "lucide-react";

export default function SharedMedicalRecordPage() {
  const params = useParams();
  const token = params?.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [data, setData] = useState<any>(null);

  const fetchRecord = async (enteredPasscode?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = `/api/v1/patient/shared-record/${token}${
        enteredPasscode ? `?passcode=${encodeURIComponent(enteredPasscode)}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        if (json.requirePasscode) {
          setRequirePasscode(true);
          setErrorMsg(json.error || "Please enter the 4-digit PIN.");
        } else {
          setErrorMsg(json.error || "Unable to access shared medical record.");
        }
        setData(null);
      } else {
        setData(json.data);
        setRequirePasscode(false);
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg("Failed to connect to NiniMed clinical server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRecord();
    }
  }, [token]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecord(passcode);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white space-y-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Decrypting authorized medical share pass...</p>
      </div>
    );
  }

  // ── PIN Code Protection Prompt ──────────────────────────────────────────
  if (requirePasscode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-teal-500/30 bg-slate-900 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Protected Clinical Record</h1>
            <p className="text-xs text-slate-400 mt-1">
              The patient protected this clinical record with a 4-digit security PIN.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter PIN"
              className="w-full text-center tracking-widest text-xl font-mono py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-400"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-lg hover:from-teal-400 hover:to-emerald-400 transition-all"
            >
              Unlock Medical Record
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────
  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-rose-500/30 bg-slate-900 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-white">Medical Share Pass Unavailable</h1>
          <p className="text-xs text-slate-400">{errorMsg || "This link is expired or invalid."}</p>
        </div>
      </div>
    );
  }

  const { patient, clinicalSummary, shareMetadata } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── TOP DOCTOR BANNER ────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 border border-teal-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-teal-400 uppercase tracking-wider">
                  NiniMed Health Network
                </span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                  Doctor Access Pass
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Authorized patient-shared clinical summary for consulting physicians.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              Print Record
            </button>
          </div>
        </div>

        {/* ── PATIENT DEMOGRAPHIC & MEDICAL ID CARD ────────────────────────── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Patient Medical Profile
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {patient.fullName}
              </h1>
              <p className="text-xs text-slate-400">
                {patient.gender?.toUpperCase()} • {patient.age} Years Old • DOB: {patient.dateOfBirth}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">MRN Number</span>
                <span className="text-sm font-mono font-bold text-white">{patient.mrn}</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <span className="text-[9px] uppercase font-bold text-rose-400 block flex items-center gap-1">
                  <Droplet className="w-3 h-3" /> Blood Type
                </span>
                <span className="text-sm font-mono font-black">{patient.bloodType}</span>
              </div>
            </div>
          </div>

          {/* National ID & Branch Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Ethiopian National ID:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-white">{patient.nationalId}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                  VERIFIED
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-400" /> Primary Branch:
              </span>
              <span className="text-slate-200 font-medium truncate max-w-[200px]">
                {patient.preferredClinicBranch}
              </span>
            </div>
          </div>

          {/* ── CRITICAL ALLERGIES ALERT ─────────────────────────────────── */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Known Medical Allergies & Adverse Reactions</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {patient.allergies?.map((a: any, i: number) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-rose-500/40 text-xs font-bold text-rose-200 flex items-center gap-2"
                >
                  <span>{a.allergen}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ACTIVE MEDICATIONS & VITALS GRID ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Medications */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-extrabold uppercase tracking-wider">
              <Pill className="w-4 h-4" />
              <span>Current Medications & Regimens</span>
            </div>
            <div className="space-y-2.5">
              {clinicalSummary.medications?.map((m: any, i: number) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{m.medicationName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-[10px] font-bold">
                      {m.dosage}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{m.frequency} • {m.instructions}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Labs & Vitals */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-extrabold uppercase tracking-wider">
              <FlaskConical className="w-4 h-4" />
              <span>Recent Diagnostic Labs & Vitals</span>
            </div>

            {/* Vitals Mini-Bar */}
            {clinicalSummary.vitals && (
              <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[9px] uppercase text-slate-500 font-bold block">BP</span>
                  <span className="text-xs font-bold text-white">{clinicalSummary.vitals.bloodPressure}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 font-bold block">Pulse</span>
                  <span className="text-xs font-bold text-white">{clinicalSummary.vitals.heartRate}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-slate-500 font-bold block">SpO2</span>
                  <span className="text-xs font-bold text-emerald-300">{clinicalSummary.vitals.oxygenSaturation}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {clinicalSummary.labs?.map((l: any, i: number) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{l.testName}</span>
                    <span className="text-[10px] text-slate-400">{l.date}</span>
                  </div>
                  <span className="font-mono text-cyan-300 font-bold text-right text-[11px]">
                    {l.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MANAGED CONDITIONS ─────────────────────────────────────────── */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-extrabold uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            <span>Active Diagnoses & Chronic Care Management</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clinicalSummary.diagnoses?.map((d: any, i: number) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block">{d.condition}</span>
                  {d.code && <span className="text-[10px] text-slate-500 font-mono">ICD-10: {d.code}</span>}
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  Managed
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER AUDIT NOTE ──────────────────────────────────────────── */}
        <div className="text-center text-xs text-slate-500 pt-4 space-y-1">
          <p>
            This clinical data is transmitted under authorized patient consent pursuant to national health records directives.
          </p>
          <p className="font-mono text-[10px] text-slate-600">
            Access Pass Expiry: {new Date(shareMetadata.expiresAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
