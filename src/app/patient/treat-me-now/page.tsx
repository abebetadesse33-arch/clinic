"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  Video,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  Heart,
  Stethoscope,
  PhoneCall,
  Activity,
  Loader2,
} from "lucide-react";
import SymptomAssessment, { SymptomAssessmentData } from "@/components/treat-me-now/SymptomAssessment";
import TriageResultView from "@/components/treat-me-now/TriageResult";
import ProviderMatchingView from "@/components/treat-me-now/ProviderMatching";
import LiveQueueStatus from "@/components/treat-me-now/LiveQueueStatus";
import type { TriageResult } from "@/lib/services/triage-service";
import type { MatchedProvider } from "@/lib/services/provider-matching-service";
import { useClinic } from "@/context/ClinicContext";

type FlowStep = "landing" | "assessment" | "triage_result" | "matching" | "live_queue";

const COMMON_CONCERNS = [
  { id: "cold-flu", label: "Cold, Flu & COVID-19", icon: "🤧", desc: "Sore throat, congestion, fever, dry cough" },
  { id: "uti", label: "Urinary Tract Infection", icon: "💧", desc: "Burning, frequency, pelvic discomfort" },
  { id: "skin-rash", label: "Skin Rash & Allergies", icon: "🩹", desc: "Itching, hives, eczema, bug bites" },
  { id: "sinus-allergy", label: "Sinus & Seasonal Allergy", icon: "🌸", desc: "Nasal pressure, itchy watery eyes" },
  { id: "stomach", label: "Stomach, Nausea & Cramps", icon: "🍵", desc: "Upset stomach, diarrhea, acid reflux" },
  { id: "rx-renewal", label: "Emergency Rx Refill", icon: "💊", desc: "Immediate 30-day bridge prescription" },
];

function TreatMeNowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingCaseId = searchParams.get("caseId");
  const existingQueueId = searchParams.get("queueId");
  const { currentUser, currentRole, isAuthenticated } = useClinic();

  useEffect(() => {
    if (!isAuthenticated || currentRole !== "patient") {
      router.replace(`/signin?redirect=${encodeURIComponent("/patient/treat-me-now")}`);
    }
  }, [isAuthenticated, currentRole, router]);

  const [step, setStep] = useState<FlowStep>(
    existingCaseId || existingQueueId ? "live_queue" : "landing"
  );
  const [selectedInitialConcern, setSelectedInitialConcern] = useState<string>("");
  const [assessmentData, setAssessmentData] = useState<SymptomAssessmentData | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [matchedProviders, setMatchedProviders] = useState<MatchedProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<MatchedProvider | null>(null);
  const [confirmedSession, setConfirmedSession] = useState<{
    caseId: string;
    queueId: string;
    position: number;
    estimatedWaitMinutes: number;
    roomUrl: string;
  } | null>(null);

  const [isTriaging, setIsTriaging] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // If URL has existing caseId/queueId, automatically initialize live_queue
  useEffect(() => {
    if (existingCaseId || existingQueueId) {
      setConfirmedSession({
        caseId: existingCaseId || "active-urgent-case",
        queueId: existingQueueId || "active-queue",
        position: 1,
        estimatedWaitMinutes: 3,
        roomUrl: `/telemedicine/room-${existingCaseId || "active-urgent-case"}?role=patient`,
      });
      setStep("live_queue");
    }
  }, [existingCaseId, existingQueueId]);

  // Step 1 -> Step 2: User starts assessment from landing or concern click
  const handleStartConcern = (concernLabel?: string) => {
    if (!isAuthenticated || currentRole !== "patient") {
      router.push(`/signin?redirect=${encodeURIComponent("/patient/treat-me-now")}`);
      return;
    }

    if (concernLabel) {
      setSelectedInitialConcern(concernLabel);
    }
    setStep("assessment");
  };

  // Step 2 -> Step 3: Assessment submitted -> Run AI Triage & Query Providers
  const handleAssessmentSubmit = async (data: SymptomAssessmentData) => {
    setAssessmentData(data);
    setIsTriaging(true);

    try {
      // 1. Trigger AI Triage
      const res = await fetch("/api/v1/treat-me-now/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: data.chiefComplaint,
          severityScale: data.severityScale,
          duration: data.duration,
          additionalSymptoms: data.additionalSymptoms,
          vitals: data.vitals,
        }),
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        setTriageResult(resData.data);

        // 2. Query available matching providers
        const matchRes = await fetch("/api/v1/treat-me-now/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specialty: resData.data.recommendedSpecialty,
            urgency: resData.data.urgencyLevel,
          }),
        });
        const matchData = await matchRes.json();
        if (matchData.success && matchData.data) {
          const list = [
            matchData.data.matchedProvider,
            ...(matchData.data.alternativeProviders || []),
          ].filter(Boolean);
          setMatchedProviders(list);
          setSelectedProvider(matchData.data.matchedProvider || list[0] || null);
        }

        setStep("triage_result");
      }
    } catch (err) {
      console.error("Triage error:", err);
    } finally {
      setIsTriaging(false);
    }
  };

  // Step 4: User confirms matched provider -> Finalize case, queue, and token
  const handleConfirmVisit = async () => {
    if (!assessmentData || !selectedProvider) return;
    setIsConfirming(true);

    try {
      const res = await fetch("/api/v1/treat-me-now/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientInfo: {
            fullName: currentUser?.fullName || "Urgent Care Patient",
            email: currentUser?.email || undefined,
          },
          triageResult,
          provider: selectedProvider,
          careFormat: assessmentData.careFormat,
          symptoms: {
            chiefComplaint: assessmentData.chiefComplaint,
            duration: assessmentData.duration,
            severityScale: assessmentData.severityScale,
            additionalSymptoms: assessmentData.additionalSymptoms,
            vitals: assessmentData.vitals,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setConfirmedSession(data.data);
        setStep("live_queue");
      }
    } catch (err) {
      console.error("Visit confirmation error:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/patient/dashboard"
            className="text-xs text-slate-400 hover:text-teal-400 font-semibold flex items-center gap-1.5 transition-colors"
          >
            ← Patient Dashboard
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>24/7 Virtual Urgent Care Active</span>
          </div>
        </div>

        {/* ─── 1. LANDING VIEW ──────────────────────────────────────────────── */}
        {step === "landing" && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B3B32] via-[#005C4B] to-[#04362D] p-8 sm:p-12 text-white shadow-2xl border border-teal-500/30 space-y-6">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white text-[#005C4B] text-xs font-extrabold tracking-wide uppercase shadow-sm">
                  ⚡ 24/7 On-Demand Urgent Care
                </span>
                <span className="text-xs font-mono text-emerald-200/90 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
                  Avg Wait: &lt; 3 min
                </span>
              </div>

              <div className="space-y-3 max-w-2xl">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Treat Me Now™
                </h1>
                <p className="text-sm sm:text-base text-[#E8F4F0]/90 leading-relaxed font-normal">
                  Connect with a board-certified physician or nurse practitioner in minutes. No appointment or travel required. Real-time AI triage, immediate physician matching, and electronic prescriptions sent instantly.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={() => handleStartConcern()}
                  className="py-4 px-8 rounded-2xl bg-[#D96B43] hover:bg-[#C25832] text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-orange-950/50 hover:scale-[1.02]"
                >
                  <Zap className="w-5 h-5 fill-white" />
                  <span>Start Rapid Triage &amp; Connect (0 min wait)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Emergency Notice */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-xs text-amber-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold mb-0.5">Emergency Symptoms Notice:</strong>
                <span>
                  Treat Me Now™ is designed for non-emergency acute illness, infections, and refills. If you are experiencing crushing chest pain, severe shortness of breath, sudden numbness, or life-threatening symptoms, call <strong>911</strong> or proceed to the nearest emergency room immediately.
                </span>
              </div>
            </div>

            {/* Common Concerns Quick Grid */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Select what you are experiencing:</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any condition below to launch automated symptom intake.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {COMMON_CONCERNS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleStartConcern(c.label)}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 hover:border-teal-500/50 transition-all text-left flex items-start gap-3.5 group"
                  >
                    <span className="text-3xl shrink-0 group-hover:scale-110 transition-transform">
                      {c.icon}
                    </span>
                    <div>
                      <div className="font-extrabold text-xs text-white group-hover:text-teal-400 transition-colors">
                        {c.label}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {c.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. SYMPTOM ASSESSMENT VIEW ──────────────────────────────────── */}
        {step === "assessment" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block">
                    Step 1 of 3
                  </span>
                  <h2 className="text-xl font-extrabold text-white">Rapid AI Symptom Assessment</h2>
                </div>
              </div>
              <button
                onClick={() => setStep("landing")}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <SymptomAssessment
              initialComplaint={selectedInitialConcern}
              onSubmit={handleAssessmentSubmit}
              isLoading={isTriaging}
            />
          </div>
        )}

        {/* ─── 3. TRIAGE RESULT VIEW ───────────────────────────────────────── */}
        {step === "triage_result" && triageResult && (
          <TriageResultView
            triage={triageResult}
            onProceed={() => setStep("matching")}
            onBack={() => setStep("assessment")}
          />
        )}

        {/* ─── 4. PROVIDER MATCHING VIEW ───────────────────────────────────── */}
        {step === "matching" && (
          <ProviderMatchingView
            providers={matchedProviders}
            selectedProvider={selectedProvider}
            onSelectProvider={(p) => setSelectedProvider(p)}
            onConfirm={handleConfirmVisit}
            onBack={() => setStep("triage_result")}
            isConfirming={isConfirming}
          />
        )}

        {/* ─── 5. LIVE QUEUE & CONSULTATION READY VIEW ───────────────────────── */}
        {step === "live_queue" && confirmedSession && (
          <LiveQueueStatus
            caseId={confirmedSession.caseId}
            queueId={confirmedSession.queueId}
            initialPosition={confirmedSession.position}
            initialWaitMinutes={confirmedSession.estimatedWaitMinutes}
            doctorInfo={selectedProvider || undefined}
            careFormat={assessmentData?.careFormat || "video"}
            roomUrl={confirmedSession.roomUrl}
            onCancel={() => setStep("landing")}
          />
        )}
      </div>
    </div>
  );
}

export default function TreatMeNowPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400 text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Initializing Treat Me Now™ 24/7 Virtual Center...</span>
        </div>
      }
    >
      <TreatMeNowContent />
    </Suspense>
  );
}

