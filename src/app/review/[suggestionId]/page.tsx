"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useClinic } from "../../../context/ClinicContext";
import MultimodalMediaViewer from "../../../components/MultimodalMediaViewer";
import {
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  Stethoscope,
  Sparkles,
  Pill,
  Activity,
  Layers,
  Zap,
  Eye,
  Dna,
} from "lucide-react";

export default function ClinicalReviewConsolePage() {
  const params = useParams();
  const router = useRouter();
  const suggestionId = params.suggestionId as string;

  const { aiSuggestions, patients, mediaAssets, reviewAiSuggestion, currentUser, currentRole } = useClinic();

  const suggestion = aiSuggestions.find((s) => s.id === suggestionId) || aiSuggestions[0];
  const patient = patients.find((p) => p.id === suggestion?.patientId) || patients[0];
  const pMedia = mediaAssets.filter((m) => m.patientId === patient?.id);

  const [decision, setDecision] = useState<"accepted_full" | "accepted_modified" | "rejected">("accepted_full");
  const [showMediaEvidence, setShowMediaEvidence] = useState(false);
  const [clinicianNotes, setClinicianNotes] = useState(
    "Clinical review completed. Multimodal evidence (PA Chest X-ray, 12-Lead ECG strip, and CYP2C19 *2/*2 loss-of-function panel) verified. Candidate therapy initiated under cardiorenal monitoring protocol."
  );

  // Editable fields for modifications
  const [medModifications, setMedModifications] = useState(
    suggestion?.aiResponse?.medicationSuggestions?.map((m) => ({
      medicationName: m.drug,
      dosage: m.dosage,
      frequency: m.frequency,
      durationDays: 30,
      quantity: 30,
      refillsAllowed: 3,
      instructions: `${m.frequency}. ${m.precautions}`,
    })) || []
  );

  const [pin, setPin] = useState("782914");
  const [isSigned, setIsSigned] = useState(false);

  if (!suggestion) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-white">No AI Suggestion Found</h2>
        <Link href="/patients" className="mt-4 inline-block text-teal-400 font-semibold text-xs">
          Return to Patients
        </Link>
      </div>
    );
  }

  const handleMedChange = (index: number, field: string, value: any) => {
    setMedModifications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setDecision("accepted_modified");
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicianNotes) return;

    reviewAiSuggestion(
      suggestion.id,
      decision,
      clinicianNotes,
      decision !== "rejected" ? medModifications : undefined
    );

    setIsSigned(true);
    setTimeout(() => {
      router.push("/prescriptions");
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Back Button */}
      <Link
        href={`/patients/${patient.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Patient Profile ({patient.firstName} {patient.lastName})
      </Link>

      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-teal-500/40 bg-slate-900/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase">
              Multimodal Physician Sign-Off Console
            </span>
            <span className="text-xs text-slate-400 font-mono">Evaluation ID: {suggestion.id}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Clinical Decision Review & Prescription Authorization
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Patient: <strong className="text-white">{patient.firstName} {patient.lastName}</strong> (MRN: {patient.mrn}) | Licensed Clinician:{" "}
            <strong className="text-teal-400">{currentUser.fullName} ({currentUser.licenseNumber || "MD-782914-TX"})</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>21 CFR Part 11 Electronic Signature</span>
        </div>
      </div>

      {/* Multimodal Cross-Modal Evidence Quick Bar */}
      {suggestion.aiResponse.modalityAttributions && suggestion.aiResponse.modalityAttributions.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-teal-300 flex items-center gap-1.5 uppercase">
              <Zap className="w-4 h-4 text-teal-400" />
              Multimodal Evidence Cited by Gemini 1.5 Pro
            </h3>
            <button
              type="button"
              onClick={() => setShowMediaEvidence(!showMediaEvidence)}
              className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              {showMediaEvidence ? "Hide Raw Media Inspector" : "Inspect Raw Media & Signals"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {suggestion.aiResponse.modalityAttributions.map((att, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                <span className="text-[9px] font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.2 rounded font-mono block w-fit mb-1">
                  {att.modalityType}
                </span>
                <span className="font-bold text-white text-[11px] block">{att.label}</span>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{att.findingSummary}</p>
              </div>
            ))}
          </div>

          {/* Collapsible Media Viewer */}
          {showMediaEvidence && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <MultimodalMediaViewer assets={pMedia} />
            </div>
          )}
        </div>
      )}

      {/* Success Notification */}
      {isSigned && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-3 animate-fade-in shadow-2xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
          <div>
            <h4 className="font-bold text-sm text-white">Electronic Prescription & Lab Orders Authorized!</h4>
            <p>Signed and sealed by {currentUser.fullName}. Redirecting to Prescription Hub...</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleConfirmReview} className="space-y-6">
        {/* Decision Selector */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Physician Determination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDecision("accepted_full")}
              className={`p-4 rounded-xl border text-left transition-all ${
                decision === "accepted_full"
                  ? "bg-teal-500/20 border-teal-500 text-white shadow-lg shadow-teal-900/30"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Accept Full Plan
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Approve AI medication and diagnostic plan as proposed.</p>
            </button>

            <button
              type="button"
              onClick={() => setDecision("accepted_modified")}
              className={`p-4 rounded-xl border text-left transition-all ${
                decision === "accepted_modified"
                  ? "bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-900/30"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Modify & Sign
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Adjust dosages, instructions, or refill count before signing.</p>
            </button>

            <button
              type="button"
              onClick={() => setDecision("rejected")}
              className={`p-4 rounded-xl border text-left transition-all ${
                decision === "rejected"
                  ? "bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-900/30"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-400" />
                Reject Suggestions
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Discard AI proposals; proceed with alternative management.</p>
            </button>
          </div>
        </div>

        {/* Prescription Verification Table */}
        {decision !== "rejected" && (
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Medications to be E-Prescribed
            </h3>

            <div className="space-y-3">
              {medModifications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Medication Name</label>
                      <input
                        type="text"
                        value={med.medicationName}
                        onChange={(e) => handleMedChange(idx, "medicationName", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Strength / Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Frequency & Sig</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Duration (Days)</label>
                      <input
                        type="number"
                        value={med.durationDays}
                        onChange={(e) => handleMedChange(idx, "durationDays", parseInt(e.target.value) || 30)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Dispense Quantity</label>
                      <input
                        type="number"
                        value={med.quantity}
                        onChange={(e) => handleMedChange(idx, "quantity", parseInt(e.target.value) || 30)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Authorized Refills</label>
                      <input
                        type="number"
                        value={med.refillsAllowed}
                        onChange={(e) => handleMedChange(idx, "refillsAllowed", parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clinician Rationale Notes */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Mandatory Clinician Verification Notes & Medical Rationale *
          </label>
          <textarea
            rows={3}
            required
            value={clinicianNotes}
            onChange={(e) => setClinicianNotes(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            placeholder="Document your clinical rationale and validation details..."
          />
        </div>

        {/* Digital Signature & PIN */}
        <div className="glass-panel p-5 rounded-2xl border border-teal-500/40 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h4 className="text-sm font-bold text-white">Cryptographic Digital Signature</h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Signing as: <strong className="text-slate-200">{currentUser.fullName}</strong> ({currentUser.licenseNumber || "MD-782914-TX"})
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-0.5">Physician PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-mono text-center text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSigned}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-900/40 transition-all hover:scale-105 mt-4 sm:mt-0"
            >
              Confirm & Sign Electronic Prescription
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
