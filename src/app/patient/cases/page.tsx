"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  FolderOpen,
  Sparkles,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Plus,
  RefreshCw,
  Loader2,
  FileText,
  User,
  Activity,
  ArrowRight,
  Shield,
} from "lucide-react";

interface PatientCaseItem {
  caseId: string;
  complaint: {
    chiefComplaint: string;
    severity: string;
    duration: string;
    seekingUrgent: boolean;
  };
  assignedHandler: string;
  status: string;
  submittedAt: string;
  aiAnalysis?: {
    summary: string;
    urgencyLevel: string;
    analysisConfidence: number;
    patientEducationPoints?: string[];
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  pending_ai_analysis: { label: "AI Analysis in Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", step: 1 },
  ai_analyzed: { label: "Assigned & AI Triaged", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30", step: 2 },
  under_review: { label: "Under Specialist Review", color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/30", step: 3 },
  awaiting_tests: { label: "Lab Orders / Tests Pending", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30", step: 4 },
  escalated: { label: "Urgent Priority Escalation", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", step: 3 },
  resolved: { label: "Case Resolved & Care Plan Active", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", step: 5 },
};

export default function PatientCasesPage() {
  return (
    <RoleGuard
      allowedRoles={["patient", "system_admin", "tenant_admin", "physician", "nurse"]}
      fallbackTitle="Patient Case Follow-up"
    >
      <PatientCasesContent />
    </RoleGuard>
  );
}

function PatientCasesContent() {
  const [cases, setCases] = useState<PatientCaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/cases");
      const data = await res.json();
      if (data.success && data.data?.cases) {
        setCases(data.data.cases);
      }
    } catch {
      setCases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-md">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">My Submitted Health Cases</h1>
              <p className="text-xs text-slate-400 mt-0.5">Track case status, view AI findings, chat with clinicians, and monitor your care plan</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCases}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 hover:bg-slate-900 text-xs font-bold text-slate-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/patient/submit-case"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" /> Submit New Health Case
          </Link>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase">
            NiniMed AI Clinical Concierge
          </span>
          <h2 className="text-lg font-bold text-white">Live Real-Time Clinical Case Follow-up</h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Every case you submit is analyzed by our Gemini 1.5 Pro decision support engine and routed directly to a designated case handler. You can follow diagnostic workups, chat with doctors, verify prescriptions, and rate your care journey.
          </p>
        </div>
        <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 shrink-0">
          <div className="text-center">
            <span className="text-2xl font-black text-white">{cases.length}</span>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Cases</span>
          </div>
          <div className="text-center">
            <span className="text-2xl font-black text-teal-400">{cases.filter((c) => c.status === "under_review" || c.status === "ai_analyzed").length}</span>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Active in Review</span>
          </div>
        </div>
      </div>

      {/* Cases List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-xs text-slate-400">Fetching your health cases & AI updates...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Submitted Cases Yet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              If you are experiencing symptoms, need a second opinion, or want to consult our clinical team, you can submit your health history supported by photos, audio, and documents.
            </p>
          </div>
          <Link
            href="/patient/submit-case"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Submit Your First Case
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cases.map((c) => {
            const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending_ai_analysis;
            return (
              <Link
                key={c.caseId}
                href={`/patient/cases/${c.caseId}`}
                className="group block bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-teal-950/20"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-teal-400">{c.caseId}</span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {statusConfig.label}
                      </span>
                      {c.complaint.seekingUrgent && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase">
                          🚨 Urgent Triage
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                        {c.complaint.chiefComplaint}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Duration: <strong className="text-slate-300">{c.complaint.duration}</strong></span>
                        <span>•</span>
                        <span>Severity: <strong className="text-amber-400 capitalize">{c.complaint.severity?.replace("_", " ")}</strong></span>
                      </p>
                    </div>

                    {c.aiAnalysis && (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{c.aiAnalysis.summary}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
                    <div className="text-left lg:text-right text-xs">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Assigned Clinician</span>
                      <span className="text-white font-bold flex items-center gap-1.5 lg:justify-end mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                        {c.assignedHandler}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-teal-400 font-bold group-hover:translate-x-1 transition-transform">
                      <span>View Live Follow-up & Chat</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
