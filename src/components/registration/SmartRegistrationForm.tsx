"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  User,
  Calendar,
  Lock,
  FileText,
  Heart,
  Pill,
  Clock,
  Stethoscope,
  Activity,
  Check,
} from "lucide-react";
import AITriagePanel from "./AITriagePanel";
import ProviderMatchCard from "./ProviderMatchCard";
import type { TriageResult } from "@/lib/services/triage-service";
import type { MatchedProvider } from "@/lib/services/provider-matching-service";

export default function SmartRegistrationForm({ token }: { token?: string } = {}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "female" as "male" | "female" | "other",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",

    // Medical & Symptoms
    chiefComplaint: "",
    symptoms: "",
    duration: "1-3 days",
    severityScale: 5,
    knownAllergies: "",
    chronicConditions: "",
    currentMedications: "",

    // Insurance
    insuranceProvider: "",
    policyNumber: "",

    // Consents
    consentTreatment: true,
    consentAiProcessing: true,
    consentDataSharing: true,
  });

  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [candidateProviders, setCandidateProviders] = useState<MatchedProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MatchedProvider | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Pre-populate if invited with an invitation token
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/v1/public/register/${token}`);
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          setInvitationData(json.data);
          setFormData((prev) => ({
            ...prev,
            firstName: json.data.submittedData?.firstName || prev.firstName,
            lastName: json.data.submittedData?.lastName || prev.lastName,
            email: json.data.email || json.data.submittedData?.email || prev.email,
            phone: json.data.phone || json.data.submittedData?.phone || prev.phone,
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch invitation details:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 1. Run inline AI Triage when entering Step 3
  const handleAnalyzeSymptoms = async () => {
    if (!formData.chiefComplaint) {
      setErrorMsg("Please describe your primary reason for visit / symptoms first.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: formData.chiefComplaint,
          symptoms: formData.symptoms,
          duration: formData.duration,
          severityScale: formData.severityScale,
          patientDemographics: {
            gender: formData.gender,
            dateOfBirth: formData.dateOfBirth,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTriageResult(data.data);

        // Fetch candidate providers for this specialty
        const provRes = await fetch(
          `/api/v1/providers/available?specialty=${encodeURIComponent(
            data.data.recommendedSpecialty
          )}&urgency=${data.data.urgencyLevel}`
        );
        const provData = await provRes.json();
        if (provData.success && provData.data?.providers) {
          setCandidateProviders(provData.data.providers);
          setSelectedProvider(provData.data.providers[0] || null);
        }

        setStep(4);
      } else {
        setErrorMsg(data.error || "Could not analyze symptoms");
      }
    } catch {
      setErrorMsg("Failed to connect to AI triage engine. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Complete Registration & Assignment
  const handleFinalSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/patients/register-with-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          invitationToken: token || undefined,
          preferredProviderId: selectedProvider?.id,
          preferredSpecialty: triageResult?.recommendedSpecialty,
          knownAllergies: formData.knownAllergies.split(",").map((s) => s.trim()).filter(Boolean),
          chronicConditions: formData.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean),
          currentMedications: formData.currentMedications.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSubmitResult(data.data);
        setStep(5);
      } else {
        setErrorMsg(data.error || "Registration submission failed");
      }
    } catch {
      setErrorMsg("Network error during submission. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      {/* Step Tracker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className={step >= 1 ? "text-teal-400 font-bold" : ""}>1. Personal</span>
          <span className={step >= 2 ? "text-teal-400 font-bold" : ""}>2. Medical Info</span>
          <span className={step >= 3 ? "text-teal-400 font-bold" : ""}>3. Symptoms & AI</span>
          <span className={step >= 4 ? "text-teal-400 font-bold" : ""}>4. Doctor Match</span>
          <span className={step >= 5 ? "text-teal-400 font-bold" : ""}>5. Active</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {invitationData && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Verified Clinical Invitation Active</span>
              <span className="text-[11px] text-teal-300/80">
                Pre-filled chart intake for <strong className="text-white">{invitationData.email}</strong>
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
            Invited ✓
          </span>
        </div>
      )}

      {/* STEP 1: Personal Demographics */}
      {step === 1 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Step 1 of 4</span>
            <h2 className="text-xl font-extrabold text-white mt-1">Patient Demographics & Contact</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your identity to initiate automatic chart creation and AI clinical triage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Eleanor"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Last Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vance"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Biological Sex</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!formData.firstName || !formData.lastName || !formData.email) {
                setErrorMsg("Please fill in first name, last name, and email.");
                return;
              }
              setErrorMsg(null);
              setStep(2);
            }}
            className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30"
          >
            <span>Continue to Medical Intake</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Medical History & Coverage */}
      {step === 2 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Step 2 of 4</span>
            <h2 className="text-xl font-extrabold text-white mt-1">Medical Background & Coverage</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Help our AI and assigned physician review contraindications and allergies.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Known Drug or Food Allergies</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Peanuts (comma separated)"
                value={formData.knownAllergies}
                onChange={(e) => setFormData({ ...formData, knownAllergies: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Chronic Medical Conditions</label>
              <input
                type="text"
                placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                value={formData.chronicConditions}
                onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Current Daily Medications</label>
              <input
                type="text"
                placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                value={formData.currentMedications}
                onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30"
            >
              <span>Continue to Symptoms & AI Triage</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Symptoms & AI Triage Input */}
      {step === 3 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Step 3 of 4</span>
            <h2 className="text-xl font-extrabold text-white mt-1">Symptoms & Clinical Triage</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Describe what you are experiencing. Gemini AI will analyze urgency and match the right specialist.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Primary Concern / Chief Complaint *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sore throat with mild fever and dry cough since yesterday"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Additional Details & Observations:
              </label>
              <textarea
                rows={3}
                placeholder="Describe onset, triggers, severity, or any other details..."
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="< 24h">Less than 24 hours</option>
                  <option value="1-3 days">1 to 3 days</option>
                  <option value="1 week">About 1 week</option>
                  <option value="> 2 weeks">Over 2 weeks</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Pain / Severity (1-10): <strong className="text-teal-400">{formData.severityScale}/10</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.severityScale}
                  onChange={(e) => setFormData({ ...formData, severityScale: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400 mt-2"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!formData.chiefComplaint || loading}
              onClick={handleAnalyzeSymptoms}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal-900/40 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></span>
                  AI Analyzing Symptoms & Matching Doctor...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Analyze Symptoms & Match Doctor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: AI Triage Result & Doctor Selection */}
      {step === 4 && (
        <div className="space-y-6">
          {triageResult && <AITriagePanel triage={triageResult} />}

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">Step 4 of 4</span>
              <h3 className="text-lg font-extrabold text-white mt-0.5">Matched On-Call Physician</h3>
              <p className="text-xs text-slate-400">
                Select your preferred clinician to confirm assignment and register into the live queue.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {candidateProviders.map((p) => (
                <ProviderMatchCard
                  key={p.id}
                  provider={p}
                  isSelected={selectedProvider?.id === p.id}
                  onSelect={(prov) => setSelectedProvider(prov)}
                />
              ))}
            </div>

            {/* Consents */}
            <div className="pt-2 space-y-2 border-t border-slate-800">
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentTreatment}
                  onChange={(e) => setFormData({ ...formData, consentTreatment: e.target.checked })}
                  className="mt-0.5 accent-teal-500"
                />
                <span>I authorize virtual consultation, clinical review, and electronic prescription routing.</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading || !formData.consentTreatment}
                onClick={handleFinalSubmit}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal-900/40 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></span>
                    Creating Patient Chart & Enqueueing...
                  </span>
                ) : (
                  <>
                    <span>Complete Registration & Enter Queue</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Success & Active Case Summary */}
      {step === 5 && submitResult && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-teal-500/30 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto shadow-xl shadow-teal-900/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-extrabold uppercase">
              Account & Case Active
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-3">
              Welcome, {submitResult.patient?.fullName}!
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              Your patient chart has been generated, AI triage completed, and clinician assigned.
            </p>
          </div>

          {/* Quick Stats Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Assigned MRN:</span>
              <span className="font-mono font-bold text-white">{submitResult.patient?.mrn}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Case Number:</span>
              <span className="font-mono font-bold text-teal-400">{submitResult.case?.caseNumber}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Assigned Clinician:</span>
              <span className="font-bold text-white">{submitResult.matchedProvider?.fullName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Queue Position:</span>
              <span className="font-mono font-bold text-cyan-400">
                #{submitResult.queue?.position ?? 1} (~{submitResult.queue?.estimatedWaitMinutes ?? 3} min wait)
              </span>
            </div>
          </div>

          <div className="pt-2 space-y-3 max-w-md mx-auto">
            <Link
              href={`/patient/treat-me-now?caseId=${submitResult.case?.caseId}`}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-teal-900/40"
            >
              <Clock className="w-4 h-4" />
              <span>Track Live Queue & Enter Consultation Room</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/patient/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs transition-all"
            >
              Go to Patient Portal Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
